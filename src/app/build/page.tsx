import { connection } from "next/server";
import { headers } from "next/headers";
import { Workshop } from "@/components/workshop";
import { siteUrlFromHeaders } from "@/lib/site-url";

export default async function BuildPage() {
  await connection();
  const requestHeaders = await headers();
  return <Workshop siteUrl={siteUrlFromHeaders(requestHeaders, "http://localhost:3010")} />;
}
