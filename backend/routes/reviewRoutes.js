const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
    listMyReviews, createReview, updateReview, deleteReview
} = require("../controllers/reviewController");

const router = express.Router();
router.use(protect);
router.get("/mine", requireRole("customer"), listMyReviews);
router.post("/restaurant/:restaurantId", requireRole("customer"), createReview);
router.put("/:id", requireRole("customer"), updateReview);
router.delete("/:id", requireRole("customer", "admin"), deleteReview);

module.exports = router;
