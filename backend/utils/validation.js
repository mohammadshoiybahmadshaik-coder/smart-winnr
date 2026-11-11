const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);
const isValidRating = (value) => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;

const passwordError = (password) => {
    if (typeof password !== "string" || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/.test(password)) {
        return "Password must be 8-16 characters and include uppercase, lowercase, a number, and a special character.";
    }
    return null;
};

const emailError = (email) => {
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return "Please enter a valid email address.";
    }
    return null;
};

const sendValidationError = (res, message) => res.status(400).json({ message });

module.exports = { isValidObjectId, isValidRating, passwordError, emailError, sendValidationError };
