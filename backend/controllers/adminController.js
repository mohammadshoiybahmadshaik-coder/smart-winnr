const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const Review = require("../models/Review");
const { passwordError, emailError, isValidObjectId } = require("../utils/validation");
const { publicUser, generateToken } = require("./authController");

const getDashboard = async (_req, res) => {
    const [totalUsers, totalRestaurants, totalReviews, rating] = await Promise.all([
        User.countDocuments(),
        Restaurant.countDocuments(),
        Review.countDocuments(),
        Review.aggregate([{ $group: { _id: null, average: { $avg: "$rating" } } }])
    ]);
    const ratingDistribution = await Review.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $project: { _id: 0, rating: "$_id", count: 1 } },
        { $sort: { rating: -1 } }
    ]);
    return res.status(200).json({
        totalUsers,
        totalRestaurants,
        totalReviews,
        averagePlatformRating: rating[0] ? Number(rating[0].average.toFixed(1)) : null,
        ratingDistribution
    });
};

const listUsers = async (req, res) => {
    const filter = {};
    if (typeof req.query.search === "string" && req.query.search.trim()) {
        const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: regex }, { email: regex }];
    }
    if (["admin", "customer", "owner"].includes(req.query.role)) filter.role = req.query.role;
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).limit(200);
    return res.status(200).json({ users });
};

const createUser = async (req, res) => {
    const { name, email, password, role = "owner" } = req.body || {};
    if (typeof name !== "string" || !name.trim() || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
    }
    if (emailError(email)) return res.status(400).json({ message: emailError(email) });
    if (passwordError(password)) return res.status(400).json({ message: passwordError(password) });
    if (!["admin", "customer", "owner"].includes(role)) return res.status(400).json({ message: "Invalid user role." });
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: "Email already registered." });
    try {
        const user = await User.create({
            name: name.trim(), email: normalizedEmail, role,
            password: await bcrypt.hash(password, 12)
        });
        return res.status(201).json({ user: publicUser(user), token: generateToken(user) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Email already registered." });
        if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
        throw error;
    }
};

const updateUser = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
    const allowed = ["name", "email", "role"];
    const keys = Object.keys(req.body || {});
    if (!keys.length || keys.some((key) => !allowed.includes(key))) return res.status(400).json({ message: "Only name, email, and role can be updated." });
    if (req.body.role && !["admin", "customer", "owner"].includes(req.body.role)) return res.status(400).json({ message: "Invalid user role." });
    if (req.body.email && emailError(req.body.email)) return res.status(400).json({ message: emailError(req.body.email) });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user._id.equals(req.user._id) && req.body.role && req.body.role !== "admin") {
        return res.status(400).json({ message: "You cannot change your own administrator role." });
    }
    const wasOwner = user.role === "owner";
    if (req.body.name !== undefined) {
        if (typeof req.body.name !== "string" || !req.body.name.trim()) return res.status(400).json({ message: "Name cannot be empty." });
        user.name = req.body.name.trim();
    }
    if (req.body.email !== undefined) user.email = req.body.email.trim().toLowerCase();
    if (req.body.role !== undefined) user.role = req.body.role;
    try {
        await user.save();
        if (wasOwner && user.role !== "owner") {
            await Restaurant.updateMany({ owner: user._id }, { $set: { owner: null } });
        }
        return res.status(200).json({ user: publicUser(user) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Email already registered." });
        if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
        throw error;
    }
};

const deleteUser = async (req, res) => {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
    if (req.params.id === String(req.user._id)) return res.status(400).json({ message: "You cannot delete your own account." });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    await Promise.all([
        Review.deleteMany({ customer: user._id }),
        Restaurant.updateMany({ owner: user._id }, { $set: { owner: null } })
    ]);
    return res.status(200).json({ message: "User deleted." });
};

const listAdminReviews = async (req, res) => {
    const reviews = await Review.find()
        .populate("customer", "name email")
        .populate("restaurant", "name")
        .sort({ createdAt: -1 }).limit(500);
    return res.status(200).json({ reviews });
};

module.exports = { getDashboard, listUsers, createUser, updateUser, deleteUser, listAdminReviews };
