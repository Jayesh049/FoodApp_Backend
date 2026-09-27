import React, { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthProvider';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import '../Styles/review.css';

const ReviewPage = () => {
  const [purchasedPlans, setPurchasedPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviews, setReviews] = useState([]);
  const { user } = useAuth();
  const history = useHistory();

  const getAuthHeader = () => {
    const stored = localStorage.getItem('token');
    if (!stored) return undefined;
    // stored might already be "Bearer xxx"
    return stored.startsWith('Bearer ') ? stored : `Bearer ${stored}`;
  };

  useEffect(() => {
    if (!user) {
      history.push('/login');
      return;
    }
    fetchPurchasedPlans();
  }, [user, history]);

  const fetchPurchasedPlans = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/v1/review/my-purchases', {
        headers: {
          Authorization: getAuthHeader()
        }
      });
      setPurchasedPlans(response.data.plans);
    } catch (error) {
      console.error('Error fetching purchased plans:', error);
    }
  };

  const checkCanReview = async (planId) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/v1/review/can-review/${planId}`, {
        headers: {
          Authorization: getAuthHeader()
        }
      });
      setCanReview(response.data.canReview);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
    }
  };

  const fetchPlanReviews = async (planId) => {
    try {
      const response = await axios.get(`http://localhost:3000/api/v1/review/plan/${planId}`);
      setReviews(response.data.reviews);
    } catch (error) {
      console.error('Error fetching plan reviews:', error);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    checkCanReview(plan._id);
    fetchPlanReviews(plan._id);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!selectedPlan || !reviewText.trim()) {
      alert('Please select a plan and write a review');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://localhost:3000/api/v1/review/plan/${selectedPlan._id}`, {
        rating: rating,
        review: reviewText.trim()
      }, {
        headers: {
          Authorization: getAuthHeader()
        }
      });

      alert('Review submitted successfully!');
      
      // Reset form
      setReviewText('');
      setRating(5);
      setCanReview(false);
      
      // Refresh reviews
      fetchPlanReviews(selectedPlan._id);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error.response?.data?.message || 'Error submitting review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, interactive = false, onRatingChange = null) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="review-page">
      <div className="review-container">
        <h1>Rate & Review Your Orders</h1>
        
        {purchasedPlans.length === 0 ? (
          <div className="no-purchases">
            <h3>No purchases found</h3>
            <p>You haven't made any purchases yet.</p>
            <button onClick={() => history.push('/allPlans')}>
              Browse Plans
            </button>
          </div>
        ) : (
          <div className="review-content">
            {/* Purchased Plans List */}
            <div className="purchased-plans">
              <h2>Your Purchased Plans</h2>
              <div className="plans-grid">
                {purchasedPlans.map((plan) => (
                  <div 
                    key={plan._id} 
                    className={`plan-card ${selectedPlan?._id === plan._id ? 'selected' : ''}`}
                    onClick={() => handlePlanSelect(plan)}
                  >
                    <img 
                      src={`http://localhost:3000/${plan.image}`} 
                      alt={plan.name}
                      className="plan-image"
                    />
                    <div className="plan-info">
                      <h3>{plan.name}</h3>
                      <p>₹{plan.price}</p>
                      <p>Purchased: {new Date(plan.purchasedAt).toLocaleDateString()}</p>
                      <p>Quantity: {plan.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Review Form */}
            {selectedPlan && (
              <div className="review-form-section">
                <h2>Write a Review for {selectedPlan.name}</h2>
                
                {!canReview ? (
                  <div className="cannot-review">
                    <p>You have already reviewed this plan or cannot review it at this time.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitReview} className="review-form">
                    <div className="rating-section">
                      <label>Your Rating:</label>
                      {renderStars(rating, true, setRating)}
                      <span className="rating-text">{rating} out of 5 stars</span>
                    </div>

                    <div className="review-text-section">
                      <label htmlFor="reviewText">Your Review:</label>
                      <textarea
                        id="reviewText"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Share your experience with this plan..."
                        rows={4}
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="submit-review-btn"
                      disabled={loading || !reviewText.trim()}
                    >
                      {loading ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                )}

                {/* Existing Reviews */}
                <div className="existing-reviews">
                  <h3>Reviews for {selectedPlan.name}</h3>
                  {reviews.length === 0 ? (
                    <p>No reviews yet. Be the first to review!</p>
                  ) : (
                    <div className="reviews-list">
                      {reviews.map((review) => (
                        <div key={review._id} className="review-item">
                          <div className="review-header">
                            <div className="reviewer-info">
                              <img 
                                src={review.user?.pic || '/default-avatar.png'} 
                                alt={review.user?.name}
                                className="reviewer-avatar"
                              />
                              <div>
                                <h4>{review.user?.name || 'Anonymous'}</h4>
                                <p>{new Date(review.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="review-rating">
                              {renderStars(review.rating)}
                            </div>
                          </div>
                          <p className="review-text">{review.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
