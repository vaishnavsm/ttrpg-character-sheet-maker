import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D&D/TTRPG Character Sheet Maker",
  description: "Render a character sheet from JSON.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
