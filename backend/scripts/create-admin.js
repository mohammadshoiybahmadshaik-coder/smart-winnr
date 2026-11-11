require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { emailError, passwordError } = require("../utils/validation");

const createAdmin = async () => {
    const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI must be configured.");
    if (emailError(ADMIN_EMAIL)) throw new Error(emailError(ADMIN_EMAIL));
    if (passwordError(ADMIN_PASSWORD)) throw new Error(passwordError(ADMIN_PASSWORD));

    await mongoose.connect(process.env.MONGO_URI);
    const email = ADMIN_EMAIL.trim().toLowerCase();
    if (await User.exists({ email })) throw new Error("That administrator email is already registered.");
    const user = await User.create({
        name: (ADMIN_NAME || "Administrator").trim(),
        email,
        password: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: "admin"
    });
    console.log(`Administrator account created for ${user.email}.`);
};

if (require.main === module) {
    createAdmin()
        .catch((error) => {
            console.error("Could not create administrator:", error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        });
}

module.exports = createAdmin;
