require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const startServer = async () => {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be configured.");
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
        throw new Error("JWT_SECRET must be set to at least 32 characters.");
    }
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
};

if (require.main === module) {
    startServer().catch((error) => {
        console.error("Server startup failed:", error.message);
        process.exitCode = 1;
    });
}

module.exports = { app, startServer };
