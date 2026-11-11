
const express = require("express");

const {
    registerUser,
    loginUser
} = require("../controllers/authController");

const router = express.Router();

// Registration API
router.post("/register", registerUser);

// Login API
router.post("/login", loginUser);

module.exports = router;
