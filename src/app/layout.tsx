import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "DOMOV | Realitná agentúra", template: "%s | DOMOV" },
  description: "Realitná platforma pre Slovensko.",
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const l = (await headers()).get("x-locale") ?? "sk";
  return (
    <html lang={l}>
      <body>{children}</body>
    </html>
  );
}
