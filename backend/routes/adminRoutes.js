const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
    getDashboard, listUsers, createUser, updateUser, deleteUser, listAdminReviews
} = require("../controllers/adminController");
const {
    listRestaurants, createRestaurant, updateRestaurant, assignRestaurantOwner, deleteRestaurant
} = require("../controllers/restaurantController");

const router = express.Router();
router.use(protect, requireRole("admin"));
router.get("/dashboard", getDashboard);
router.get("/users", listUsers);
router.post("/users", createUser);
router.patch("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);
router.get("/restaurants", listRestaurants);
router.post("/restaurants", createRestaurant);
router.patch("/restaurants/:id/owner", assignRestaurantOwner);
router.patch("/restaurants/:id", updateRestaurant);
router.delete("/restaurants/:id", deleteRestaurant);
router.get("/reviews", listAdminReviews);

module.exports = router;
