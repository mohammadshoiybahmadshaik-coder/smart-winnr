const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { emailError, passwordError } = require("../utils/validation");

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
});

const generateToken = (user) => jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
);

const registerUser = async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || !name.trim() || !email || !password) {
        return res.status(400).json({ message: "Name, email, and password are required." });
    }
    const invalidEmail = emailError(email);
    if (invalidEmail) return res.status(400).json({ message: invalidEmail });
    const invalidPassword = passwordError(password);
    if (invalidPassword) return res.status(400).json({ message: invalidPassword });

    try {
        const normalizedEmail = email.trim().toLowerCase();
        if (await User.exists({ email: normalizedEmail })) {
            return res.status(409).json({ message: "Email already registered." });
        }
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: await bcrypt.hash(password, 12),
            role: "customer"
        });
        return res.status(201).json({
            message: "Registration successful.",
            token: generateToken(user),
            user: publicUser(user)
        });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "Email already registered." });
        if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
        throw error;
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        return res.status(400).json({ message: "Email and password are required." });
    }
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password." });
    }
    return res.status(200).json({
        message: "Login successful.",
        token: generateToken(user),
        user: publicUser(user)
    });
};

module.exports = { registerUser, loginUser, publicUser, generateToken };
