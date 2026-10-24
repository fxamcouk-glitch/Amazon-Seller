import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="font-semibold focus-visible:outline-2 focus-visible:outline-accent">
            {SITE_NAME}
          </Link>
          <p className="text-sm text-muted">Free UK delivery</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-line">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted">© {new Date().getFullYear()} {SITE_NAME}</p>
      </footer>
    </>
  );
}
