const maximumBodyBytes = 250_000;

export type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; response: Response };

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

export async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    return {
      ok: false,
      response: errorResponse(415, "unsupported_media_type", "Send the request body as application/json."),
    };
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBodyBytes) {
    return {
      ok: false,
      response: errorResponse(413, "payload_too_large", "Keep the character JSON below 250,000 bytes."),
    };
  }

  const source = await request.text();
  if (Buffer.byteLength(source) > maximumBodyBytes) {
    return {
      ok: false,
      response: errorResponse(413, "payload_too_large", "Keep the character JSON below 250,000 bytes."),
    };
  }

  try {
    return { ok: true, value: JSON.parse(source) as unknown };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, "invalid_json", "The request body is not valid JSON."),
    };
  }
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = new Set([
    new URL(request.url).origin,
    ...(process.env.API_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ]);
  return allowed.has(origin) ? origin : "";
}

export function authorizeApiRequest(request: Request): Response | null {
  return allowedOrigin(request) === ""
    ? errorResponse(403, "origin_not_allowed", "Origin is not allowed.")
    : null;
}

export function apiResponse(request: Request, response: Response): Response {
  const origin = allowedOrigin(request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Vary", "Origin");
  headers.set("X-Content-Type-Options", "nosniff");
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export function apiOptions(request: Request): Response {
  const forbidden = authorizeApiRequest(request);
  if (forbidden) return apiResponse(request, forbidden);

  return apiResponse(
    request,
    new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    }),
  );
}
