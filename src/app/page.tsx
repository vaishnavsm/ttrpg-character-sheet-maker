import Link from "next/link";
import { headers } from "next/headers";
import { CopyInstruction } from "@/components/copy-instruction";

export default async function Home() {
  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3010")
    .split(",")[0]
    .trim();
  const protocol = (requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https"))
    .split(",")[0]
    .trim();
  const mcpUrl = `${protocol}://${host}/mcp`;
  const instruction = `Connect to ${mcpUrl} and use it to render my character sheet.`;

  return (
    <main className="home">
      <h1>D&amp;D/TTRPG Character Sheet Maker</h1>
      <nav aria-label="Developer endpoints">
        <a href="/mcp">MCP</a>
        <a href="/api/v1">API</a>
      </nav>
      <CopyInstruction text={instruction} />
      <Link className="primary-link" href="/build">Do it yourself</Link>
    </main>
  );
}
