const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Authentication required. Please login." });
    }

    try {
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User no longer exists." });
        }
        req.user = user;
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Invalid or expired token." });
        }
        return next(error);
    }
};

const optionalProtect = async (req, res, next) => {
    if (!req.headers.authorization) return next();
    return protect(req, res, next);
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "You do not have permission to perform this action." });
    }
    return next();
};

module.exports = { protect, optionalProtect, requireRole };
