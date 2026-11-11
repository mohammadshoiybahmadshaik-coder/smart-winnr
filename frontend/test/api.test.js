import test from "node:test";
import assert from "node:assert/strict";
import { api, jsonBody } from "../src/api.js";

test("API client sends bearer auth and JSON bodies", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ success: true }) };
  };
  try {
    const result = await api("/users/profile", {
      token: "test-token",
      method: "POST",
      body: jsonBody({ name: "Diner" })
    });
    assert.deepEqual(result, { success: true });
    assert.equal(captured.url, "http://localhost:5000/api/users/profile");
    assert.equal(captured.options.headers.Authorization, "Bearer test-token");
    assert.equal(captured.options.headers["Content-Type"], "application/json");
    assert.equal(captured.options.body, "{\"name\":\"Diner\"}");
  } finally { globalThis.fetch = originalFetch; }
});

test("API client surfaces meaningful server errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 409, json: async () => ({ message: "Duplicate review." }) });
  try {
    await assert.rejects(api("/reviews"), { message: "Duplicate review." });
  } finally { globalThis.fetch = originalFetch; }
});
