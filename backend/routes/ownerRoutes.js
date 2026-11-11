const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { ownerRestaurant, updateOwnerRestaurant } = require("../controllers/restaurantController");
const { listRestaurantReviews } = require("../controllers/reviewController");
const Restaurant = require("../models/Restaurant");

const router = express.Router();
router.use(protect, requireRole("owner"));

router.get("/restaurant", ownerRestaurant);
router.patch("/restaurant", updateOwnerRestaurant);
router.get("/reviews", async (req, res) => {
    const restaurant = await Restaurant.findOne({ owner: req.user._id }).select("_id");
    if (!restaurant) return res.status(404).json({ message: "No restaurant is assigned to your account." });
    req.params.restaurantId = String(restaurant._id);
    return listRestaurantReviews(req, res);
});

module.exports = router;
