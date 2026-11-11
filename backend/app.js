require("dotenv").config();

const express = require("express");
const cors = require("cors");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
    .split(",").map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS."));
    }
}));
app.use(express.json({ limit: "20kb" }));

app.get("/", (_req, res) => res.status(200).json({ message: "Smart Winnr API is running" }));
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);

app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Request body must contain valid JSON." });
    }
    if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
    if (error.name === "CastError") return res.status(400).json({ message: "Invalid resource identifier." });
    console.error("API error:", error);
    return res.status(500).json({ message: "An unexpected server error occurred." });
});

module.exports = app;
