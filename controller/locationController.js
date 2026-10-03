const logger = require("../utilities/logger");
const axios = require('axios');
const FooduserModel = require("../model/userModule");

// Update user location with coordinates
async function updateLocationController(req, res, next) {
    try {
        const userId = req.userId;
        const { latitude, longitude } = req.body;

        // Validate coordinates
        if (!latitude || !longitude) {
            return res.status(400).json({
                result: "Latitude and longitude are required"
            });
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                result: "Invalid coordinates"
            });
        }

        // Get address from coordinates using OpenStreetMap
        const addressData = await geocodeCoordinates(latitude, longitude);

        // Update user location
        const user = await FooduserModel.findByIdAndUpdate(
            userId,
            {
                location: {
                    coordinates: {
                        latitude: latitude,
                        longitude: longitude
                    },
                    address: addressData.address,
                    city: addressData.city,
                    state: addressData.state,
                    country: addressData.country,
                    pincode: addressData.pincode,
                    lastUpdated: new Date()
                }
            },
            { new: true }
        );

        res.status(200).json({
            result: "Location updated successfully",
            location: user.location
        });

    } catch (err) {
        next(err);
    }
}

// Get user's current location
async function getLocationController(req, res, next) {
    try {
        const userId = req.userId;
        const user = await FooduserModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                result: "User not found"
            });
        }

        if (!user.location) {
            return res.status(404).json({
                result: "Location not set",
                message: "Please update your location first"
            });
        }

        res.status(200).json({
            result: "Location retrieved successfully",
            location: user.location
        });

    } catch (err) {
        next(err);
    }
}

// Get location by IP (fallback method)
async function getLocationByIPController(req, res, next) {
    try {
        const clientIP = req.ip || req.connection.remoteAddress;
        
        // Use ipapi.co for IP-based geolocation
        const response = await axios.get(`https://ipapi.co/json/`);
        const locationData = response.data;

        res.status(200).json({
            result: "Location retrieved by IP",
            location: {
                coordinates: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude
                },
                address: `${locationData.city}, ${locationData.region}, ${locationData.country}`,
                city: locationData.city,
                state: locationData.region,
                country: locationData.country,
                pincode: locationData.postal,
                lastUpdated: new Date()
            }
        });

    } catch (err) {
        next(err);
    }
}

// Geocode coordinates to address using OpenStreetMap
async function geocodeLocationController(req, res, next) {
    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                result: "Latitude and longitude are required"
            });
        }

        const addressData = await geocodeCoordinates(latitude, longitude);

        res.status(200).json({
            result: "Address retrieved successfully",
            address: addressData
        });

    } catch (err) {
        next(err);
    }
}

// Helper function to geocode coordinates using OpenStreetMap
async function geocodeCoordinates(latitude, longitude) {
    try {
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'FoodApp/1.0'
                }
            }
        );

        const data = response.data;
        const address = data.display_name || '';
        const addressParts = data.address || {};

        return {
            address: address,
            city: addressParts.city || addressParts.town || addressParts.village || '',
            state: addressParts.state || addressParts.region || '',
            country: addressParts.country || '',
            pincode: addressParts.postcode || ''
        };

    } catch (error) {
        logger.warn({ err: error }, "geocoding failed");
        return {
            address: 'Address not found',
            city: '',
            state: '',
            country: '',
            pincode: ''
        };
    }
}

// Smart location detection - Auto-fetch or manual selection
async function smartLocationController(req, res, next) {
    try {
        const { latitude, longitude, accuracy } = req.body;
        const userId = req.userId;

        // Check if GPS coordinates are provided and accurate
        if (latitude && longitude && accuracy && accuracy <= 100) {
            // GPS is accurate (within 100 meters), auto-fill location
            const addressData = await geocodeCoordinates(latitude, longitude);
            
            const user = await FooduserModel.findByIdAndUpdate(
                userId,
                {
                    location: {
                        coordinates: {
                            latitude: latitude,
                            longitude: longitude
                        },
                        address: addressData.address,
                        city: addressData.city,
                        state: addressData.state,
                        country: addressData.country,
                        pincode: addressData.pincode,
                        lastUpdated: new Date()
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                result: "Location auto-filled successfully",
                location: user.location,
                method: "gps_auto",
                accuracy: accuracy
            });
        } else {
            // GPS not accurate or not provided, get IP-based location as fallback
            const response = await axios.get(`https://ipapi.co/json/`);
            const locationData = response.data;

            return res.status(200).json({
                result: "Location fallback provided",
                location: {
                    coordinates: {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude
                    },
                    address: `${locationData.city}, ${locationData.region}, ${locationData.country}`,
                    city: locationData.city,
                    state: locationData.region,
                    country: locationData.country,
                    pincode: locationData.postal,
                    lastUpdated: new Date()
                },
                method: "ip_fallback",
                accuracy: "city_level",
                needsManualSelection: true
            });
        }

    } catch (err) {
        next(err);
    }
}

// Search locations by address (for manual map selection)
async function searchLocationController(req, res, next) {
    try {
        const { query } = req.body;

        if (!query || query.length < 3) {
            return res.status(400).json({
                result: "Search query must be at least 3 characters"
            });
        }

        // Use OpenStreetMap Nominatim for address search
        const response = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'FoodApp/1.0'
                }
            }
        );

        const locations = response.data.map(item => ({
            coordinates: {
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon)
            },
            address: item.display_name,
            city: item.address?.city || item.address?.town || item.address?.village || '',
            state: item.address?.state || item.address?.region || '',
            country: item.address?.country || '',
            pincode: item.address?.postcode || ''
        }));

        res.status(200).json({
            result: "Locations found",
            count: locations.length,
            locations: locations
        });

    } catch (err) {
        next(err);
    }
}

// Find nearby users (for delivery radius)
async function findNearbyUsersController(req, res, next) {
    try {
        const { latitude, longitude, radius = 10 } = req.body; // radius in km

        if (!latitude || !longitude) {
            return res.status(400).json({
                result: "Latitude and longitude are required"
            });
        }

        // Find users within radius using MongoDB geospatial query
        const users = await FooduserModel.find({
            'location.coordinates.latitude': {
                $gte: latitude - (radius / 111), // Rough conversion: 1 degree ≈ 111 km
                $lte: latitude + (radius / 111)
            },
            'location.coordinates.longitude': {
                $gte: longitude - (radius / (111 * Math.cos(latitude * Math.PI / 180))),
                $lte: longitude + (radius / (111 * Math.cos(latitude * Math.PI / 180)))
            }
        }).select("name location");

        res.status(200).json({
            result: "Nearby users found",
            count: users.length,
            users: users
        });

    } catch (err) {
        next(err);
    }
}

module.exports = {
    updateLocationController,
    getLocationController,
    getLocationByIPController,
    geocodeLocationController,
    findNearbyUsersController,
    smartLocationController,
    searchLocationController
};
