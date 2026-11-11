const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Review = require("../models/Review");
const User = require("../models/User");
const { emailError, isValidObjectId, isValidRating, passwordError } = require("../utils/validation");

test("validates the assignment password and email rules", () => {
    assert.equal(passwordError("ValidPass1!"), null);
    assert.ok(passwordError("short"));
    assert.ok(passwordError("NoNumber!!"));
    assert.equal(emailError("person@example.com"), null);
    assert.ok(emailError("not-an-email"));
});

test("accepts only valid MongoDB object identifiers", () => {
    assert.equal(isValidObjectId(new mongoose.Types.ObjectId().toString()), true);
    assert.equal(isValidObjectId("not-an-id"), false);
});

test("rating validation rejects strings, decimals, and values outside 1-5", () => {
    for (const rating of [0, 6, -1, 3.5, "4", "", null]) assert.equal(isValidRating(rating), false);
    for (const rating of [1, 2, 3, 4, 5]) assert.equal(isValidRating(rating), true);
});

test("review schema rejects out-of-range ratings", async () => {
    const base = {
        customer: new mongoose.Types.ObjectId(),
        restaurant: new mongoose.Types.ObjectId(),
        comment: "Helpful review"
    };
    for (const rating of [0, 6, 3.5, null]) {
        await assert.rejects(new Review({ ...base, rating }).validate(), undefined, `Expected rating ${rating} to fail`);
    }
    await assert.doesNotReject(new Review({ ...base, rating: 5 }).validate());
});

test("user schema does not expose passwords by default and constrains roles", () => {
    assert.equal(User.schema.path("password").options.select, false);
    assert.deepEqual(User.schema.path("role").enumValues, ["admin", "customer", "owner"]);
});

test("user schema accepts bcrypt hashes while password policy stays at registration", async () => {
    const user = new User({
        name: "Diner",
        email: "diner@example.com",
        password: "$2b$12$1234567890123456789012abcdefghijklmnopqrstuvwxyzABCDEFGHIJK",
        role: "customer"
    });
    await assert.doesNotReject(user.validate());
});

test("review schema has a unique customer/restaurant index", () => {
    const index = Review.schema.indexes().find(([keys, options]) =>
        keys.customer === 1 && keys.restaurant === 1 && options.unique
    );
    assert.ok(index);
});
