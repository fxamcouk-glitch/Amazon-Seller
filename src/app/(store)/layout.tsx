import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const NAV = [
  { href: "/#fabric-lighting-cable", label: "Fabric cable" },
  { href: "/#ceramic-lights", label: "Ceramic lights" },
  { href: "/guides/choosing-fabric-lighting-cable", label: "How to choose" },
];

const FOOTER = [
  { href: "/delivery-and-returns", label: "Delivery and returns" },
  { href: "/contact", label: "Contact and business details" },
  { href: "/terms", label: "Terms of sale" },
  { href: "/privacy", label: "Privacy" },
];

const linkClass = "hover:underline focus-visible:outline-2 focus-visible:outline-accent";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="focus-visible:outline-2 focus-visible:outline-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={SITE_NAME} width={96} height={56} className="h-12 w-auto dark:rounded dark:bg-white dark:p-1" />
          </Link>
          <nav aria-label="Main" className="order-last w-full sm:order-none sm:w-auto">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={linkClass}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-sm text-muted">Free UK delivery</p>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-4 px-4 py-6 text-sm sm:flex sm:items-start sm:justify-between">
          <nav aria-label="Footer">
            <ul className="grid gap-1">
              {FOOTER.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={linkClass}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="max-w-md text-muted">
            © {new Date().getFullYear()} {SITE_NAME}. TheCable.Store is a trading name of Venture 58 Ltd,
            registered in England and Wales, company no. 14043490.
          </p>
        </div>
      </footer>
    </>
  );
}
