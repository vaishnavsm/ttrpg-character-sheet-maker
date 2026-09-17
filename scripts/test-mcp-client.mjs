import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";

const endpoint = process.argv[2] ?? "http://localhost:3010/mcp";
const client = new Client(
  { name: "folio-adhoc-test-client", version: "1.0.0" },
  { versionNegotiation: { mode: { pin: "2026-07-28" } } },
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  assert(client.getProtocolEra() === "modern", "client did not negotiate MCP 2026-07-28");

  const tools = await client.listTools();
  assert(tools.tools.some((tool) => tool.name === "validate_character"), "validate_character was not discovered");
  assert(tools.tools.some((tool) => tool.name === "render_character_sheet"), "render_character_sheet was not discovered");

  const resources = await client.listResources();
  assert(resources.resources.some((resource) => resource.uri === "skill://render-character-sheet/SKILL.md"), "skill resource was not discovered");

  const skill = await client.readResource({ uri: "skill://render-character-sheet/SKILL.md" });
  assert(skill.contents[0]?.text?.includes("name: render-character-sheet"), "skill contents were not readable");

  const character = {
    version: 1,
    name: "Ad Hoc Hero",
    system: "generic",
    identity: [{ label: "Role", value: "Explorer" }],
    attributes: [{ label: "Agility", value: 14, modifier: "+2" }],
    hitPoints: { maximum: 10 },
  };

  const validation = await client.callTool({ name: "validate_character", arguments: { candidate: character } });
  assert(validation.structuredContent?.valid === true, "valid character was rejected");

  const rendered = await client.callTool({ name: "render_character_sheet", arguments: { character } });
  const html = rendered.structuredContent?.html;
  assert(typeof html === "string" && html.startsWith("<!DOCTYPE html>"), "renderer did not return an HTML document");
  assert(html.includes("Ad Hoc Hero"), "rendered document did not contain the character metadata");
  assert(!html.includes("<script"), "rendered document unexpectedly contains a script");

  console.log(
    JSON.stringify(
      {
        endpoint,
        protocolVersion: "2026-07-28",
        tools: tools.tools.map((tool) => tool.name),
        resources: resources.resources.map((resource) => resource.uri),
        renderedBytes: Buffer.byteLength(html),
        filename: rendered.structuredContent?.filename,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
