const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const User = require("../models/User");
const { isValidObjectId } = require("../utils/validation");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const makeRestaurantPipeline = (match, userId) => [
    { $match: match },
    { $sort: { name: 1 } },
    {
        $lookup: {
            from: Review.collection.name,
            let: { restaurantId: "$_id" },
            pipeline: [
                { $match: { $expr: { $eq: ["$restaurant", "$$restaurantId"] } } },
                {
                    $facet: {
                        summary: [{ $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }],
                        distribution: [
                            { $group: { _id: "$rating", count: { $sum: 1 } } },
                            { $project: { _id: 0, rating: "$_id", count: 1 } },
                            { $sort: { rating: -1 } }
                        ]
                    }
                }
            ],
            as: "reviewStats"
        }
    },
    {
        $lookup: {
            from: Review.collection.name,
            let: { restaurantId: "$_id" },
            pipeline: [
                { $match: { $expr: { $and: [
                    { $eq: ["$restaurant", "$$restaurantId"] },
                    { $eq: ["$customer", userId || null] }
                ] } } },
                { $project: { _id: 1, rating: 1 } },
                { $limit: 1 }
            ],
            as: "customerReview"
        }
    },
    {
        $addFields: {
            rating: { $arrayElemAt: [{ $arrayElemAt: ["$reviewStats.summary", 0] }, 0] },
            ratingDistribution: { $arrayElemAt: ["$reviewStats.distribution", 0] },
            customerRating: { $arrayElemAt: ["$customerReview.rating", 0] },
            customerReviewId: { $arrayElemAt: ["$customerReview._id", 0] }
        }
    },
    {
        $project: {
            name: 1, location: 1, cuisine: 1, description: 1, owner: 1, createdAt: 1,
            averageRating: { $ifNull: ["$rating.average", null] },
            reviewCount: { $ifNull: ["$rating.count", 0] },
            ratingDistribution: { $ifNull: ["$ratingDistribution", []] },
            customerRating: { $ifNull: ["$customerRating", null] },
            customerReviewId: { $ifNull: ["$customerReviewId", null] }
        }
    }
];

const listRestaurants = async (req, res) => {
    const match = {};
    for (const field of ["search", "location", "cuisine"]) {
        const value = req.query[field];
        if (typeof value !== "string" || !value.trim()) continue;
        const regex = new RegExp(escapeRegex(value.trim()), "i");
        match[field === "search" ? "name" : field] = regex;
    }
    const restaurants = await Restaurant.aggregate(makeRestaurantPipeline(match, req.user?._id));
    return res.status(200).json({ restaurants });
};

const getRestaurant = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid restaurant ID." });
    const restaurants = await Restaurant.aggregate(makeRestaurantPipeline(
        { _id: require("mongoose").Types.ObjectId.createFromHexString(req.params.id) },
        req.user?._id
    ));
    if (!restaurants.length) return res.status(404).json({ message: "Restaurant not found." });
    return res.status(200).json({ restaurant: restaurants[0] });
};

const createRestaurant = async (req, res) => {
    const { name, location, cuisine, description = "", owner = null } = req.body || {};
    if (![name, location, cuisine].every((value) => typeof value === "string" && value.trim())) {
        return res.status(400).json({ message: "Name, location, and cuisine are required." });
    }
    if (typeof description !== "string" || description.length > 2000) {
        return res.status(400).json({ message: "Description must be a string of 2000 characters or fewer." });
    }
    if (owner !== null && !isValidObjectId(owner)) return res.status(400).json({ message: "Invalid owner ID." });
    if (owner) {
        const ownerUser = await User.findById(owner);
        if (!ownerUser || ownerUser.role !== "owner") return res.status(400).json({ message: "Assigned user must be a restaurant owner." });
        if (await Restaurant.exists({ owner })) return res.status(409).json({ message: "This owner already has an assigned restaurant." });
    }
    try {
        const restaurant = await Restaurant.create({ name: name.trim(), location: location.trim(), cuisine: cuisine.trim(), description, owner });
        return res.status(201).json({ restaurant });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "This owner already has an assigned restaurant." });
        throw error;
    }
};

const updateRestaurantFields = async (restaurant, body, res) => {
    const allowed = ["name", "location", "cuisine", "description"];
    const updates = Object.keys(body || {});
    if (!updates.length || updates.some((field) => !allowed.includes(field))) {
        return res.status(400).json({ message: "Only name, location, cuisine, and description can be updated." });
    }
    for (const field of updates) {
        if (typeof body[field] !== "string" || (field !== "description" && !body[field].trim())) {
            return res.status(400).json({ message: `${field} must be a valid string.` });
        }
        restaurant[field] = body[field].trim();
    }
    await restaurant.save();
    return res.status(200).json({ restaurant });
};

const updateRestaurant = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid restaurant ID." });
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    return updateRestaurantFields(restaurant, req.body, res);
};

const assignRestaurantOwner = async (req, res) => {
    const { ownerId } = req.body || {};
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid restaurant ID." });
    if (ownerId !== null && ownerId !== "" && !isValidObjectId(ownerId)) return res.status(400).json({ message: "Invalid owner ID." });
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    const owner = ownerId || null;
    if (owner) {
        const ownerUser = await User.findById(owner);
        if (!ownerUser || ownerUser.role !== "owner") return res.status(400).json({ message: "Assigned user must be a restaurant owner." });
        if (await Restaurant.exists({ owner, _id: { $ne: restaurant._id } })) return res.status(409).json({ message: "This owner already has an assigned restaurant." });
    }
    restaurant.owner = owner;
    try {
        await restaurant.save();
        return res.status(200).json({ restaurant });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "This owner already has an assigned restaurant." });
        throw error;
    }
};

const deleteRestaurant = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid restaurant ID." });
    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found." });
    await Review.deleteMany({ restaurant: restaurant._id });
    return res.status(200).json({ message: "Restaurant and associated reviews deleted." });
};

const ownerRestaurant = async (req, res) => {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) return res.status(404).json({ message: "No restaurant is assigned to your account." });
    return res.status(200).json({ restaurant });
};

const updateOwnerRestaurant = async (req, res) => {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) return res.status(404).json({ message: "No restaurant is assigned to your account." });
    return updateRestaurantFields(restaurant, req.body, res);
};

module.exports = {
    listRestaurants, getRestaurant, createRestaurant, updateRestaurant, assignRestaurantOwner,
    deleteRestaurant, ownerRestaurant, updateOwnerRestaurant
};
