const Review = require("../models/Review");
const Restaurant = require("../models/Restaurant");
const { isValidObjectId, isValidRating } = require("../utils/validation");

const listRestaurantReviews = async (req, res) => {
    if (!isValidObjectId(req.params.restaurantId)) return res.status(400).json({ message: "Invalid restaurant ID." });
    const restaurant = await Restaurant.findById(req.params.restaurantId).select("_id");
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    const reviews = await Review.find({ restaurant: restaurant._id })
        .populate("customer", "name")
        .sort({ createdAt: -1 });
    const [stats] = await Review.aggregate([
        { $match: { restaurant: restaurant._id } },
        { $facet: {
            summary: [{ $group: { _id: null, averageRating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } }],
            distribution: [
                { $group: { _id: "$rating", count: { $sum: 1 } } },
                { $project: { _id: 0, rating: "$_id", count: 1 } },
                { $sort: { rating: -1 } }
            ]
        } }
    ]);
    const summary = stats?.summary[0];
    return res.status(200).json({
        reviews,
        averageRating: summary ? Number(summary.averageRating.toFixed(1)) : null,
        reviewCount: summary ? summary.reviewCount : 0,
        ratingDistribution: stats?.distribution || []
    });
};

const createReview = async (req, res) => {
    const { restaurantId } = req.params;
    const { rating, comment } = req.body || {};
    if (!isValidObjectId(restaurantId)) return res.status(400).json({ message: "Invalid restaurant ID." });
    if (!isValidRating(rating)) {
        return res.status(400).json({ message: "Rating must be a whole number between 1 and 5." });
    }
    if (typeof comment !== "string" || comment.trim().length < 5 || comment.trim().length > 500) {
        return res.status(400).json({ message: "Review must contain between 5 and 500 characters." });
    }
    if (!(await Restaurant.exists({ _id: restaurantId }))) return res.status(404).json({ message: "Restaurant not found." });
    try {
        const review = await Review.create({
            customer: req.user._id,
            restaurant: restaurantId,
            rating,
            comment: comment.trim()
        });
        return res.status(201).json({ message: "Review submitted.", review });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "You have already reviewed this restaurant. Update your existing review instead." });
        }
        if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
        throw error;
    }
};

const updateReview = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid review ID." });
    const { rating, comment } = req.body || {};
    if (!isValidRating(rating)) {
        return res.status(400).json({ message: "Rating must be a whole number between 1 and 5." });
    }
    if (typeof comment !== "string" || comment.trim().length < 5 || comment.trim().length > 500) {
        return res.status(400).json({ message: "Review must contain between 5 and 500 characters." });
    }
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });
    if (!review.customer.equals(req.user._id)) return res.status(403).json({ message: "You can only update your own reviews." });
    review.rating = rating;
    review.comment = comment.trim();
    await review.save();
    return res.status(200).json({ message: "Review updated.", review });
};

const deleteReview = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid review ID." });
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found." });
    if (req.user.role !== "admin" && !review.customer.equals(req.user._id)) {
        return res.status(403).json({ message: "You can only delete your own reviews." });
    }
    await review.deleteOne();
    return res.status(200).json({ message: "Review deleted." });
};

const listMyReviews = async (req, res) => {
    const reviews = await Review.find({ customer: req.user._id })
        .populate("restaurant", "name location cuisine")
        .sort({ updatedAt: -1 });
    return res.status(200).json({ reviews });
};

module.exports = { listRestaurantReviews, createReview, updateReview, deleteReview, listMyReviews };
