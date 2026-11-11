const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Restaurant name is required"],
            trim: true,
            maxlength: 150
        },

        location: {
            type: String,
            required: [true, "Location is required"],
            trim: true,
            maxlength: 200
        },

        cuisine: {
            type: String,
            required: [true, "Cuisine is required"],
            trim: true,
            maxlength: 100
        },

        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 2000
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    {
        timestamps: true
    }
);

restaurantSchema.index({ name: "text", location: "text", cuisine: "text" });
restaurantSchema.index(
    { owner: 1 },
    { unique: true, partialFilterExpression: { owner: { $type: "objectId" } } }
);

module.exports = mongoose.model(
    "Restaurant",
    restaurantSchema
);