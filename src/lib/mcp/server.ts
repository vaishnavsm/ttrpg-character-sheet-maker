import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { mcpServerInfo } from "@/lib/mcp/discovery";
import { characterSchema } from "@/lib/sheet/schema";
import { renderCharacterSheet, validateCharacter } from "@/lib/sheet/service";
import { siteUrlFromRequest } from "@/lib/site-url";

const skillUri = "skill://render-character-sheet/SKILL.md";
const skillDescription =
  "Compose structured TTRPG character data into a compact, printable character sheet and optional cut-out reference cards. Use when creating or revising a sheet from explicit character mechanics.";

function loadSkillMarkdown(): string {
  return readFileSync(
    join(process.cwd(), "skills", "render-character-sheet", "SKILL.md"),
    "utf8",
  );
}

function skillEntry() {
  const markdown = loadSkillMarkdown();
  return {
    uri: skillUri,
    frontmatter: {
      name: "render-character-sheet",
      description: skillDescription,
    },
    resources: [
      {
        uri: skillUri,
        digest: `sha256:${createHash("sha256").update(markdown).digest("hex")}`,
        size: Buffer.byteLength(markdown),
      },
    ],
  };
}

const skillIndex = JSON.stringify(
  {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "render-character-sheet",
        type: "skill-md",
        description: skillDescription,
        url: skillUri,
      },
    ],
  },
  null,
  2,
);

const minimalExample = JSON.stringify(
  {
    version: 1,
    name: "Arin",
    system: "generic",
    identity: [{ label: "Role", value: "Explorer" }],
    attributes: [{ label: "Agility", value: 14, modifier: "+2" }],
    defenses: [{ label: "Defense", value: 12 }],
    hitPoints: { maximum: 10 },
  },
  null,
  2,
);

const validationErrorSchema = z.strictObject({
  path: z.string(),
  code: z.string(),
  message: z.string(),
});

const validationOutputSchema = z.strictObject({
  valid: z.boolean(),
  character: characterSchema.optional(),
  errors: z.array(validationErrorSchema),
});

const renderOutputSchema = z.strictObject({
  html: z.string(),
  mimeType: z.literal("text/html; charset=utf-8"),
  filename: z.string(),
});

function createServer(siteUrl: string): McpServer {
  const server = new McpServer(
    mcpServerInfo,
    {
      capabilities: {
        extensions: { "io.modelcontextprotocol/skills": {} },
      },
      instructions:
        "This is a stateless JSON-to-HTML renderer, not an autonomous agent or game-rules engine. For character-sheet creation or revision, load skill://render-character-sheet/SKILL.md, construct the character JSON yourself, then call validate_character and render_character_sheet. The human-readable character format is documented in the skill.",
    },
  );

  server.registerTool(
    "validate_character",
    {
      title: "Validate character data",
      description:
        "Validate a candidate version-1 character object without rendering it. Returns normalized data with defaults on success and JSON Pointer error paths on failure. Read skill://render-character-sheet/SKILL.md for the complete human-readable contract.",
      inputSchema: z.strictObject({ candidate: z.unknown() }),
      outputSchema: validationOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ candidate }) => {
      const output = validateCharacter(candidate);
      return {
        content: [{ type: "text", text: JSON.stringify(output) }],
        structuredContent: output,
      };
    },
  );

  server.registerTool(
    "render_character_sheet",
    {
      title: "Render character sheet HTML",
      description:
        "Render a complete, self-contained HTML character sheet from structured version-1 character data. The returned file includes its offline layout runtime and finishes pagination when opened; no site workflow or server-side browser is required. This server does not calculate game rules or invent missing values. Read skill://render-character-sheet/SKILL.md for the workflow.",
      inputSchema: z.strictObject({ character: characterSchema }),
      outputSchema: renderOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ character }) => {
      const output = renderCharacterSheet(character, siteUrl);
      return {
        content: [{ type: "text", text: output.html }],
        structuredContent: output,
      };
    },
  );

  server.registerResource(
    "render-character-sheet",
    skillUri,
    { title: "Render character sheet skill", description: skillDescription, mimeType: "text/markdown" },
    async () => ({ contents: [{ uri: skillUri, mimeType: "text/markdown", text: loadSkillMarkdown() }] }),
  );

  server.registerResource(
    "skill-index",
    "skill://index.json",
    {
      title: "Agent skill discovery index",
      description: "Compatibility discovery index for MCP clients that use the pre-SEP-2640 index convention.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{ uri: "skill://index.json", mimeType: "application/json", text: skillIndex }],
    }),
  );

  server.registerResource(
    "minimal-character-example",
    "character-sheet://examples/minimal",
    {
      title: "Minimal character example",
      description: "A small structural example for the version-1 character schema.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{ uri: "character-sheet://examples/minimal", mimeType: "application/json", text: minimalExample }],
    }),
  );

  const skillResourceSchema = z.strictObject({
    uri: z.string(),
    digest: z.string(),
    size: z.number().int().nonnegative(),
  });
  const skillEntrySchema = z.strictObject({
    uri: z.string(),
    frontmatter: z.record(z.string(), z.unknown()),
    resources: z.array(skillResourceSchema),
  });

  server.server.setRequestHandler(
    "skills/list",
    {
      params: z.object({ cursor: z.string().optional() }),
      result: z.object({
        resultType: z.literal("complete"),
        skills: z.array(skillEntrySchema),
      }),
    },
    async () => ({ resultType: "complete" as const, skills: [skillEntry()] }),
  );
  server.server.setRequestHandler(
    "skills/get",
    {
      params: z.object({ uri: z.string() }),
      result: z.object({ resultType: z.literal("complete"), skill: skillEntrySchema }),
    },
    async ({ uri }) => {
      if (uri !== skillUri) throw new Error(`Unknown skill URI: ${uri}`);
      return { resultType: "complete" as const, skill: skillEntry() };
    },
  );

  return server;
}

export async function handleMcpRequest(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = new Set([
      new URL(request.url).origin,
      ...(process.env.MCP_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ]);
    if (!allowed.has(origin)) {
      return Response.json(
        { jsonrpc: "2.0", error: { code: -32000, message: "Origin is not allowed." }, id: null },
        { status: 403 },
      );
    }
  }

  const handler = createMcpHandler(() => createServer(siteUrlFromRequest(request)), {
    legacy: "reject",
  });
  return handler.fetch(request);
}
