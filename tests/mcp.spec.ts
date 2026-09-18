import { expect, test } from "@playwright/test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

test("stateless MCP exposes its Markdown skill, validation, and shared renderer", async ({
  baseURL,
  browser,
  request,
}) => {
  const client = new Client(
    { name: "character-sheet-playwright-client", version: "1.0.0" },
    { versionNegotiation: { mode: { pin: "2026-07-28" } } },
  );
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", baseURL)));

  try {
    expect(client.getProtocolEra()).toBe("modern");
    expect(client.getDiscoverResult()?.supportedVersions).toContain("2026-07-28");
    const [tools, resources] = await Promise.all([client.listTools(), client.listResources()]);
    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "validate_character",
      "render_character_sheet",
    ]);
    expect(resources.resources.map((resource) => resource.uri)).toContain(
      "skill://render-character-sheet/SKILL.md",
    );
    expect(resources.resources.map((resource) => resource.uri)).toContain("character-sheet://examples/minimal");

    const skill = await client.readResource({ uri: "skill://render-character-sheet/SKILL.md" });
    const skillContent = skill.contents[0];
    const skillText = skillContent && "text" in skillContent ? skillContent.text : "";
    expect(skillText).toContain("name: render-character-sheet");
    expect(skillText.length).toBeGreaterThan(500);

    const invalid = await client.callTool({
      name: "validate_character",
      arguments: { candidate: { version: 1, system: "not-a-system" } },
    });
    expect(invalid.structuredContent).toMatchObject({ valid: false });

    const character = {
      version: 1,
      name: "Mira",
      system: "generic",
      attributes: [{ label: "Resolve", value: 12, modifier: "+1" }],
      features: [
        {
          name: "Focus burst",
          presentation: "card",
          description: "Gain an edge on one check.",
          usage: { resource: "Focus", amount: 1 },
        },
      ],
    };
    const rendered = await client.callTool({
      name: "render_character_sheet",
      arguments: { character },
    });
    const output = rendered.structuredContent as { html?: string; filename?: string } | undefined;
    expect(output?.html).toContain("<!DOCTYPE html>");
    expect(output?.html).toContain("Mira");
    expect(output?.html).toContain('data-layout-state="pending"');
    expect(output?.html).toContain('id="character-sheet-layout"');
    expect(output?.filename).toBe("mira-sheet.html");

    const apiRender = await request.post("/api/v1/render", { data: character });
    expect(apiRender.ok()).toBe(true);
    expect(await apiRender.text()).toBe(output?.html);

    const standalone = await browser.newPage();
    await standalone.setContent(output?.html ?? "");
    await standalone.waitForFunction(
      () => document.documentElement.dataset.layoutState !== "pending" &&
        document.documentElement.dataset.layoutState !== "running",
    );
    expect(await standalone.locator("html").getAttribute("data-layout-state")).toBe("complete");
    await expect(standalone.locator("template")).toHaveCount(0);
    await expect(standalone.locator(".reference-card")).toHaveCount(1);
    await expect(standalone.locator(".sheet-page")).toHaveCount(2);
    expect(await standalone.locator(".panel").first().evaluate((panel) => panel.style.position)).toBe("absolute");
    await standalone.close();
  } finally {
    await client.close();
  }
});

test("publishes an AI Catalog and MCP Server Card", async ({ baseURL, request }) => {
  const catalogResponse = await request.get("/.well-known/ai-catalog.json");
  expect(catalogResponse.ok()).toBe(true);
  expect(catalogResponse.headers()["content-type"]).toBe(
    "application/ai-catalog+json; charset=utf-8",
  );
  expect(catalogResponse.headers()["access-control-allow-origin"]).toBe("*");
  const catalog = await catalogResponse.json();
  expect(catalog).toEqual({
    specVersion: "1.0",
    entries: [
      {
        identifier: "urn:air:vaishnavsm.github.io:mcp:ttrpg-character-sheet-maker",
        type: "application/mcp-server-card+json",
        url: `${baseURL}/mcp/server-card`,
      },
    ],
  });

  const cardResponse = await request.get("/mcp/server-card", {
    headers: { Accept: "application/mcp-server-card+json" },
  });
  expect(cardResponse.ok()).toBe(true);
  expect(cardResponse.headers()["content-type"]).toBe(
    "application/mcp-server-card+json; charset=utf-8",
  );
  const card = await cardResponse.json();
  expect(card).toMatchObject({
    $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
    name: "io.github.vaishnavsm/ttrpg-character-sheet-maker",
    version: "0.1.0",
    remotes: [
      {
        type: "streamable-http",
        url: `${baseURL}/mcp`,
        supportedProtocolVersions: ["2026-07-28"],
      },
    ],
  });

  const notModified = await request.get("/mcp/server-card", {
    headers: { "If-None-Match": cardResponse.headers().etag },
  });
  expect(notModified.status()).toBe(304);
  expect(await notModified.body()).toHaveLength(0);
});
