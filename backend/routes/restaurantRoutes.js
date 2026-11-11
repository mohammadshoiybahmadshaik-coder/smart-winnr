const express = require("express");
const { optionalProtect } = require("../middleware/authMiddleware");
const { listRestaurants, getRestaurant } = require("../controllers/restaurantController");
const { listRestaurantReviews } = require("../controllers/reviewController");

const router = express.Router();
router.get("/", optionalProtect, listRestaurants);
router.get("/:id", optionalProtect, getRestaurant);
router.get("/:restaurantId/reviews", listRestaurantReviews);

module.exports = router;
