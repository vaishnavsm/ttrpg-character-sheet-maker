import { apiOptions, apiResponse, authorizeApiRequest } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const forbidden = authorizeApiRequest(request);
  if (forbidden) return apiResponse(request, forbidden);

  const base = new URL(request.url);
  return apiResponse(
    request,
    Response.json({
      name: "Folio character sheet renderer",
      version: "v1",
      stateless: true,
      endpoints: {
        schema: new URL("/api/v1/schema", base).href,
        validate: new URL("/api/v1/validate", base).href,
        render: new URL("/api/v1/render", base).href,
        mcp: new URL("/mcp", base).href,
      },
    }),
  );
}

export function OPTIONS(request: Request): Response {
  return apiOptions(request);
}
