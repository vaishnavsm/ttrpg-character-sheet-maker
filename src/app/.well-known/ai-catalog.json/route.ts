import { aiCatalogResponse, discoveryOptionsResponse } from "@/lib/mcp/discovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return aiCatalogResponse(request);
}

export function OPTIONS(): Response {
  return discoveryOptionsResponse();
}
