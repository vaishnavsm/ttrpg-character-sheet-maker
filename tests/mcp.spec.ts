import { expect, test } from "@playwright/test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

test("stateless MCP exposes its Markdown skill, validation, and shared renderer", async ({
  baseURL,
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
    };
    const rendered = await client.callTool({
      name: "render_character_sheet",
      arguments: { character },
    });
    const output = rendered.structuredContent as { html?: string; filename?: string } | undefined;
    expect(output?.html).toContain("<!DOCTYPE html>");
    expect(output?.html).toContain("Mira");
    expect(output?.filename).toBe("mira-sheet.html");

    const apiRender = await request.post("/api/v1/render", { data: character });
    expect(apiRender.ok()).toBe(true);
    expect(await apiRender.text()).toBe(output?.html);
  } finally {
    await client.close();
  }
});
