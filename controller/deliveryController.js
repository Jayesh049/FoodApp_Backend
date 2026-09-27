const FoodBookingModel = require("../model/bookingModel");
const UserModel = require("../model/userModule");

function sameUserId(a, b) {
  return String(a) === String(b);
}

async function isAdminUser(userId) {
  const user = await UserModel.findById(userId).select("role");
  return Boolean(user && user.role === "admin");
}

async function updateDeliveryStatusController(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { status, latitude, longitude, notes } = req.body;

    const booking = await FoodBookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        result: "Booking not found",
      });
    }

    if (!booking.deliveryStatus) {
      booking.deliveryStatus = {};
    }

    booking.deliveryStatus.currentStatus = status;

    if (latitude && longitude) {
      booking.deliveryStatus.driverLocation = {
        latitude,
        longitude,
        lastUpdated: new Date(),
      };
    }

    if (notes) {
      booking.deliveryStatus.deliveryNotes = notes;
    }

    switch (status) {
      case "order_placed":
        booking.status = "pending";
        break;
      case "restaurant_confirmed":
      case "preparing":
        booking.status = "confirmed";
        break;
      case "ready_for_pickup":
      case "picked_up":
      case "on_the_way":
      case "nearby":
        booking.status = "out_for_delivery";
        break;
      case "delivered":
        booking.status = "delivered";
        booking.deliveryStatus.actualDeliveryTime = new Date();
        break;
      default:
        break;
    }

    await booking.save();

    res.status(200).json({
      result: "Delivery status updated successfully",
      booking: {
        _id: booking._id,
        status: booking.status,
        deliveryStatus: booking.deliveryStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getDeliveryStatusController(req, res, next) {
  try {
    const { bookingId } = req.params;

    const booking = await FoodBookingModel.findById(bookingId)
      .populate("user", "name email phonenumber")
      .populate("plan", "name");

    if (!booking) {
      return res.status(404).json({
        result: "Booking not found",
      });
    }

    const admin = await isAdminUser(req.userId);
    const ownerId = booking.user && booking.user._id ? booking.user._id : booking.user;
    if (!admin && !sameUserId(ownerId, req.userId)) {
      return res.status(403).json({ message: "Not allowed to view this delivery" });
    }

    res.status(200).json({
      result: "Delivery status retrieved",
      booking: {
        _id: booking._id,
        status: booking.status,
        deliveryStatus: booking.deliveryStatus,
        user: booking.user,
        plan: booking.plan,
        bookedAt: booking.bookedAt,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getActiveDeliveriesController(req, res, next) {
  try {
    const activeDeliveries = await FoodBookingModel.find({
      status: { $in: ["confirmed", "out_for_delivery"] },
    })
      .populate("user", "name email phonenumber")
      .populate("plan", "name")
      .sort({ bookedAt: -1 });

    res.status(200).json({
      result: "Active deliveries retrieved",
      count: activeDeliveries.length,
      deliveries: activeDeliveries,
    });
  } catch (err) {
    next(err);
  }
}

async function updateDriverLocationController(req, res, next) {
  try {
    const { bookingId } = req.params;
    const { latitude, longitude } = req.body;

    const booking = await FoodBookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        result: "Booking not found",
      });
    }

    if (!booking.deliveryStatus) {
      booking.deliveryStatus = {};
    }

    booking.deliveryStatus.driverLocation = {
      latitude,
      longitude,
      lastUpdated: new Date(),
    };

    await booking.save();

    res.status(200).json({
      result: "Driver location updated",
      location: booking.deliveryStatus.driverLocation,
    });
  } catch (err) {
    next(err);
  }
}

async function getUserDeliveryHistoryController(req, res, next) {
  try {
    const userId = req.userId;

    const deliveries = await FoodBookingModel.find({ user: userId })
      .populate("plan", "name image")
      .sort({ bookedAt: -1 });

    res.status(200).json({
      result: "Delivery history retrieved",
      count: deliveries.length,
      deliveries: deliveries,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  updateDeliveryStatusController,
  getDeliveryStatusController,
  getActiveDeliveriesController,
  updateDriverLocationController,
  getUserDeliveryHistoryController,
};
