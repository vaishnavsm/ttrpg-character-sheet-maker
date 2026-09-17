import { apiOptions, apiResponse, authorizeApiRequest, readJsonBody } from "@/lib/api/http";
import { validateCharacter } from "@/lib/sheet/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const forbidden = authorizeApiRequest(request);
  if (forbidden) return apiResponse(request, forbidden);

  const body = await readJsonBody(request);
  if (!body.ok) return apiResponse(request, body.response);
  return apiResponse(request, Response.json(validateCharacter(body.value)));
}

export function OPTIONS(request: Request): Response {
  return apiOptions(request);
}
