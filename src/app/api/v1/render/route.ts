import { apiOptions, apiResponse, authorizeApiRequest, readJsonBody } from "@/lib/api/http";
import { renderCharacterSheet, validateCharacter } from "@/lib/sheet/service";
import { siteUrlFromRequest } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const forbidden = authorizeApiRequest(request);
  if (forbidden) return apiResponse(request, forbidden);

  const body = await readJsonBody(request);
  if (!body.ok) return apiResponse(request, body.response);

  const validation = validateCharacter(body.value);
  if (!validation.valid) {
    return apiResponse(request, Response.json(validation, { status: 422 }));
  }

  const output = renderCharacterSheet(validation.character, siteUrlFromRequest(request));
  return apiResponse(
    request,
    new Response(output.html, {
      headers: {
        "Content-Type": output.mimeType,
        "Content-Disposition": `inline; filename="${output.filename}"`,
      },
    }),
  );
}

export function OPTIONS(request: Request): Response {
  return apiOptions(request);
}
