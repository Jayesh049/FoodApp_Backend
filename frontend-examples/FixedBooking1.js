import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthProvider';
import { useHistory } from 'react-router-dom';
import axios from 'axios';

const FixedBooking1 = () => {
  const [cartData, setCartData] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const history = useHistory();

  useEffect(() => {
    // Get cart data from localStorage
    const storedCartData = localStorage.getItem('cartData');
    const storedTotalPrice = localStorage.getItem('totalPrice');
    
    if (storedCartData) {
      setCartData(JSON.parse(storedCartData));
    }
    if (storedTotalPrice) {
      setTotalPrice(parseFloat(storedTotalPrice));
    }
  }, []);

  const displayRazorpay = async () => {
    if (!user) {
      alert('Please login to continue with payment.');
      history.push('/login');
      return;
    }

    if (cartData.length === 0) {
      alert('Your cart is empty! Add some items first.');
      return;
    }

    setLoading(true);
    console.log('Starting payment process...');
    console.log('Cart items:', cartData);
    console.log('User:', user);

    try {
      // Prepare payment data
      const paymentData = {
        bookedAt: new Date().toISOString(),
        price: totalPrice,
        priceAtThatTime: totalPrice,
        user: user._id, // Use actual user ID
        cartItems: cartData, // Send all cart items
        status: "pending"
      };

      console.log('Sending payment data:', paymentData);

      // Create booking (use correct port 3001)
      const response = await axios.post("http://localhost:3001/api/v1/booking/", paymentData);
      
      console.log('Booking created:', response.data);

      // Load Razorpay script
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        const options = {
          key: response.data.id, // Use the order ID from response
          amount: response.data.amount, // Amount in paise
          currency: response.data.currency,
          name: 'FoodApp',
          description: 'Food Order Payment',
          order_id: response.data.id,
          handler: async function (response) {
            console.log('Payment successful:', response);
            
            // Verify payment
            try {
              const verifyResponse = await axios.post("http://localhost:3001/api/v1/booking/verify", {
                orderCreationId: response.data.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpayOrderId: response.razorpay_order_id,
                razorpaySignature: response.razorpay_signature
              });
              
              console.log('Payment verified:', verifyResponse.data);
              
              // Clear cart and redirect
              localStorage.removeItem('cartData');
              localStorage.removeItem('totalPrice');
              
              alert('Payment successful! Your order has been placed.');
              history.push('/success');
              
            } catch (error) {
              console.error('Payment verification failed:', error);
              alert('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
            contact: user.phonenumber
          },
          theme: {
            color: '#3399cc'
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        alert('Failed to load payment gateway. Please try again.');
        setLoading(false);
      };
      document.body.appendChild(script);

    } catch (error) {
      console.error('Error in payment process:', error);
      alert('Error processing payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-container">
      <h2>Order Summary</h2>
      
      <div className="cart-items">
        {cartData.map((item, index) => (
          <div key={index} className="cart-item">
            <img src={`http://localhost:3001/${item.image}`} alt={item.name} />
            <div className="item-details">
              <h3>{item.name}</h3>
              <p>Quantity: {item.quantity}</p>
              <p>Price: ₹{item.price}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="total-section">
        <h3>Total: ₹{totalPrice}</h3>
      </div>

      <button 
        className="pay-button" 
        onClick={displayRazorpay}
        disabled={loading || !user}
      >
        {loading ? 'Processing...' : `Pay ₹${totalPrice}`}
      </button>

      {!user && (
        <p className="login-prompt">
          Please <a href="/login">login</a> to continue with payment.
        </p>
      )}
    </div>
  );
};

export default FixedBooking1;
