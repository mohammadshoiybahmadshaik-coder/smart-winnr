const test = require("node:test");
const assert = require("node:assert/strict");
const app = require("../app");

test("health and protected API routes respond with the expected status codes", async (t) => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
    const baseUrl = `http://127.0.0.1:${server.address().port}`;

    const health = await fetch(`${baseUrl}/`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).message, "Smart Winnr API is running");

    const admin = await fetch(`${baseUrl}/api/admin/dashboard`);
    assert.equal(admin.status, 401);
    assert.match((await admin.json()).message, /Authentication required/);

    const owner = await fetch(`${baseUrl}/api/owner/restaurant`);
    assert.equal(owner.status, 401);

    const invalidRegistration = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Diner", email: "diner@example.com", password: "weak" })
    });
    assert.equal(invalidRegistration.status, 400);
    assert.match((await invalidRegistration.json()).message, /Password must be 8-16 characters/);

    const malformedJson = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid"
    });
    assert.equal(malformedJson.status, 400);

    const missing = await fetch(`${baseUrl}/no-such-route`);
    assert.equal(missing.status, 404);
});
