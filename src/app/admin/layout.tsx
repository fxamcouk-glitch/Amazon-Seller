import type { Metadata } from "next";
import { SideNav } from "@/components/side-nav";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <SideNav />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-8">{children}</main>
    </div>
  );
}
