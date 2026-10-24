import type { Metadata } from "next";
import "./globals.css";
import { SideNav } from "@/components/side-nav";

export const metadata: Metadata = {
  title: "The Cable Store Dashboard",
  description: "Amazon, Shopify and website performance in one place.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen md:flex">
        <SideNav />
        <main className="flex-1 min-w-0 px-4 py-6 md:px-8">{children}</main>
      </body>
    </html>
  );
}
