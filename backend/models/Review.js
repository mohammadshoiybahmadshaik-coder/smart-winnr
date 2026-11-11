const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        restaurant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true
        },

        rating: {
            type: Number,
            required: [true, "Rating is required"],
            min: [1, "Rating must be at least 1"],
            max: [5, "Rating cannot exceed 5"],
            validate: {
                validator: Number.isInteger,
                message: "Rating must be a whole number"
            }
        },

        comment: {
            type: String,
            required: [true, "Review comment is required"],
            trim: true,
            minlength: [5, "Review must contain at least 5 characters"],
            maxlength: [500, "Review cannot exceed 500 characters"]
        }
    },
    {
        timestamps: true
    }
);

// Prevent duplicate reviews
reviewSchema.index(
    {
        customer: 1,
        restaurant: 1
    },
    {
        unique: true
    }
);

reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ customer: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);