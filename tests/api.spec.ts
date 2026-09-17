import { expect, test } from "@playwright/test";

const character = {
  version: 1,
  name: "API Hero",
  system: "generic",
  attributes: [{ label: "Resolve", value: 12, modifier: "+1" }],
};

test.describe("HTTP API", () => {
  test("discovers endpoints and publishes the character schema", async ({ request }) => {
    const discovery = await request.get("/api/v1");
    expect(discovery.ok()).toBe(true);
    await expect(discovery.json()).resolves.toMatchObject({
      version: "v1",
      stateless: true,
      endpoints: {
        schema: /\/api\/v1\/schema$/,
        validate: /\/api\/v1\/validate$/,
        render: /\/api\/v1\/render$/,
        mcp: /\/mcp$/,
      },
    });

    const schema = await request.get("/api/v1/schema");
    expect(schema.ok()).toBe(true);
    await expect(schema.json()).resolves.toMatchObject({ type: "object" });
  });

  test("validates direct character JSON and applies defaults", async ({ request }) => {
    const response = await request.post("/api/v1/validate", { data: character });
    expect(response.ok()).toBe(true);
    await expect(response.json()).resolves.toMatchObject({
      valid: true,
      character: { name: "API Hero", paper: "a4", resources: [] },
      errors: [],
    });
  });

  test("returns standalone HTML for direct character JSON", async ({ request }) => {
    const response = await request.post("/api/v1/render", { data: character });
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.headers()["content-disposition"]).toBe(
      'inline; filename="api-hero-sheet.html"',
    );
    const html = await response.text();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("API Hero");
    expect(html).not.toContain("<script");
  });

  test("uses HTTP errors for invalid requests", async ({ request }) => {
    const invalidCharacter = await request.post("/api/v1/render", {
      data: { version: 1, system: "not-a-system" },
    });
    expect(invalidCharacter.status()).toBe(422);
    await expect(invalidCharacter.json()).resolves.toMatchObject({ valid: false });

    const invalidJson = await request.post("/api/v1/render", {
      data: Buffer.from("{"),
      headers: { "Content-Type": "application/json" },
    });
    expect(invalidJson.status()).toBe(400);
    await expect(invalidJson.json()).resolves.toMatchObject({
      error: { code: "invalid_json" },
    });

    const wrongType = await request.post("/api/v1/render", {
      data: "not json",
      headers: { "Content-Type": "text/plain" },
    });
    expect(wrongType.status()).toBe(415);
  });
});
