import { apiOptions, apiResponse, authorizeApiRequest } from "@/lib/api/http";
import { getCharacterJsonSchema } from "@/lib/sheet/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request): Response {
  const forbidden = authorizeApiRequest(request);
  if (forbidden) return apiResponse(request, forbidden);
  return apiResponse(request, Response.json(getCharacterJsonSchema()));
}

export function OPTIONS(request: Request): Response {
  return apiOptions(request);
}
