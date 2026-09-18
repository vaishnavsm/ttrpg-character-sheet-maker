import { createHash } from "node:crypto";

import { siteUrlFromRequest } from "@/lib/site-url";

export const mcpServerInfo = {
  name: "io.github.vaishnavsm/ttrpg-character-sheet-maker",
  version: "0.1.0",
} as const;

export const mcpServerTitle = "TTRPG Character Sheet Maker";
export const mcpServerDescription =
  "Validate TTRPG character data and render printable, self-contained HTML character sheets.";

const serverCardMediaType = "application/mcp-server-card+json";
const catalogMediaType = "application/ai-catalog+json";

function jsonResponse(request: Request, body: unknown, mediaType: string): Response {
  const payload = `${JSON.stringify(body, null, 2)}\n`;
  const etag = `"${createHash("sha256").update(payload).digest("base64url")}"`;
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "ETag",
    "Cache-Control": "public, max-age=3600",
    "Content-Type": `${mediaType}; charset=utf-8`,
    ETag: etag,
  });

  const validators = request.headers.get("if-none-match")?.split(",").map((value) =>
    value.trim().replace(/^W\//, ""),
  );
  if (validators?.includes("*") || validators?.includes(etag)) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(payload, { headers });
}

export function serverCardResponse(request: Request): Response {
  const siteUrl = siteUrlFromRequest(request).replace(/\/$/, "");
  return jsonResponse(
    request,
    {
      $schema: "https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json",
      ...mcpServerInfo,
      description: mcpServerDescription,
      title: mcpServerTitle,
      websiteUrl: "https://github.com/vaishnavsm/ttrpg-character-sheet-maker",
      repository: {
        url: "https://github.com/vaishnavsm/ttrpg-character-sheet-maker",
        source: "github",
      },
      icons: [
        {
          src: `${siteUrl}/icon.svg`,
          mimeType: "image/svg+xml",
          sizes: ["any"],
        },
      ],
      remotes: [
        {
          type: "streamable-http",
          url: `${siteUrl}/mcp`,
          supportedProtocolVersions: ["2026-07-28"],
        },
      ],
    },
    serverCardMediaType,
  );
}

export function aiCatalogResponse(request: Request): Response {
  const siteUrl = siteUrlFromRequest(request).replace(/\/$/, "");
  return jsonResponse(
    request,
    {
      specVersion: "1.0",
      entries: [
        {
          identifier: "urn:air:vaishnavsm.github.io:mcp:ttrpg-character-sheet-maker",
          type: serverCardMediaType,
          url: `${siteUrl}/mcp/server-card`,
        },
      ],
    },
    catalogMediaType,
  );
}

export function discoveryOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, If-None-Match",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
