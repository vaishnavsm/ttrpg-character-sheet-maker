export function siteUrlFromHeaders(headers: Headers, fallbackOrigin: string): string {
  const configured = process.env.SITE_URL?.trim();
  if (configured) return configured;

  const host = (headers.get("x-forwarded-host") ?? headers.get("host"))
    ?.split(",")[0]
    .trim();
  if (!host) return fallbackOrigin;

  const fallbackProtocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const protocol = (headers.get("x-forwarded-proto") ?? fallbackProtocol)
    .split(",")[0]
    .trim();
  return `${protocol}://${host}`;
}

export function siteUrlFromRequest(request: Request): string {
  return siteUrlFromHeaders(request.headers, new URL(request.url).origin);
}
