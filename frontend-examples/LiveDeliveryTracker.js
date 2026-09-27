import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LiveDeliveryTracker = ({ bookingId }) => {
  const [deliveryStatus, setDeliveryStatus] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting user location:', error);
        }
      );
    }
  }, []);

  // Live tracking function
  const startLiveTracking = () => {
    setIsTracking(true);
    
    // Update every 3 seconds for real-time tracking
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/v1/delivery/${bookingId}/status`);
        const data = response.data;
        
        setDeliveryStatus(data.booking.deliveryStatus);
        
        // Update driver location if available
        if (data.booking.deliveryStatus.driverLocation) {
          setDriverLocation({
            lat: data.booking.deliveryStatus.driverLocation.latitude,
            lng: data.booking.deliveryStatus.driverLocation.longitude,
            lastUpdated: data.booking.deliveryStatus.driverLocation.lastUpdated
          });
        }

        // Stop tracking if delivered
        if (data.booking.deliveryStatus.currentStatus === 'delivered') {
          clearInterval(interval);
          setIsTracking(false);
        }
      } catch (error) {
        console.error('Error fetching delivery status:', error);
      }
    }, 3000); // Update every 3 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  };

  // Calculate distance between driver and user
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get progress percentage
  const getProgressPercentage = (status) => {
    const statusMap = {
      'order_placed': 10,
      'restaurant_confirmed': 20,
      'preparing': 40,
      'ready_for_pickup': 60,
      'picked_up': 70,
      'on_the_way': 85,
      'nearby': 95,
      'delivered': 100
    };
    return statusMap[status] || 0;
  };

  // Get status color
  const getStatusColor = (status) => {
    const colorMap = {
      'order_placed': '#ff6b6b',
      'restaurant_confirmed': '#4ecdc4',
      'preparing': '#45b7d1',
      'ready_for_pickup': '#96ceb4',
      'picked_up': '#feca57',
      'on_the_way': '#ff9ff3',
      'nearby': '#54a0ff',
      'delivered': '#5f27cd'
    };
    return colorMap[status] || '#ddd';
  };

  // Calculate estimated time
  const getEstimatedTime = () => {
    if (!deliveryStatus?.estimatedDeliveryTime) return 'Calculating...';
    
    const now = new Date();
    const deliveryTime = new Date(deliveryStatus.estimatedDeliveryTime);
    const diffMinutes = Math.ceil((deliveryTime - now) / (1000 * 60));
    
    if (diffMinutes <= 0) return 'Arriving now!';
    return `${diffMinutes} minutes`;
  };

  // Calculate distance to driver
  const getDistanceToDriver = () => {
    if (!driverLocation || !userLocation) return 'Calculating...';
    
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      driverLocation.lat,
      driverLocation.lng
    );
    
    if (distance < 1) {
      return `${Math.round(distance * 1000)} meters away`;
    }
    return `${distance.toFixed(1)} km away`;
  };

  return (
    <div className="live-delivery-tracker">
      <div className="tracker-header">
        <h2>🚚 Live Delivery Tracking</h2>
        <button 
          className={`tracking-btn ${isTracking ? 'active' : ''}`}
          onClick={startLiveTracking}
          disabled={isTracking}
        >
          {isTracking ? 'Tracking...' : 'Start Live Tracking'}
        </button>
      </div>

      {deliveryStatus && (
        <div className="tracking-content">
          {/* Status Card */}
          <div className="status-card" style={{ borderColor: getStatusColor(deliveryStatus.currentStatus) }}>
            <div className="status-header">
              <h3>Order Status</h3>
              <span className="status-badge" style={{ backgroundColor: getStatusColor(deliveryStatus.currentStatus) }}>
                {deliveryStatus.currentStatus.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${getProgressPercentage(deliveryStatus.currentStatus)}%`,
                    backgroundColor: getStatusColor(deliveryStatus.currentStatus)
                  }}
                ></div>
              </div>
              <span className="progress-text">
                {getProgressPercentage(deliveryStatus.currentStatus)}% Complete
              </span>
            </div>

            {/* Delivery Info */}
            <div className="delivery-info">
              <div className="info-item">
                <span className="label">Estimated Time:</span>
                <span className="value">{getEstimatedTime()}</span>
              </div>
              
              {driverLocation && (
                <div className="info-item">
                  <span className="label">Driver Distance:</span>
                  <span className="value">{getDistanceToDriver()}</span>
                </div>
              )}
              
              <div className="info-item">
                <span className="label">Last Updated:</span>
                <span className="value">
                  {driverLocation?.lastUpdated ? 
                    new Date(driverLocation.lastUpdated).toLocaleTimeString() : 
                    'Just now'
                  }
                </span>
              </div>
            </div>

            {/* Delivery Notes */}
            {deliveryStatus.deliveryNotes && (
              <div className="delivery-notes">
                <p><strong>Driver Note:</strong> {deliveryStatus.deliveryNotes}</p>
              </div>
            )}
          </div>

          {/* Map Container (You can integrate Google Maps here) */}
          {driverLocation && userLocation && (
            <div className="map-container">
              <h3>📍 Live Map</h3>
              <div className="map-placeholder">
                <p>Driver Location: {driverLocation.lat.toFixed(4)}, {driverLocation.lng.toFixed(4)}</p>
                <p>Your Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
                <p>Distance: {getDistanceToDriver()}</p>
                {/* Integrate with Google Maps API here */}
                <div className="map-integration">
                  <p>🔗 Integrate with Google Maps API for visual tracking</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="status-timeline">
            <h3>📋 Order Timeline</h3>
            <div className="timeline">
              {[
                'order_placed',
                'restaurant_confirmed', 
                'preparing',
                'ready_for_pickup',
                'picked_up',
                'on_the_way',
                'nearby',
                'delivered'
              ].map((status, index) => (
                <div 
                  key={status}
                  className={`timeline-item ${
                    deliveryStatus.currentStatus === status ? 'current' : 
                    getProgressPercentage(deliveryStatus.currentStatus) > getProgressPercentage(status) ? 'completed' : 'pending'
                  }`}
                >
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <span className="timeline-status">{status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDeliveryTracker;
