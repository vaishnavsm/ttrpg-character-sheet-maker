import { Workshop } from "@/components/workshop";

import { connection } from "next/server";

export default async function Home() {
  await connection();
  return <Workshop siteUrl={process.env.SITE_URL ?? ""} />;
}
