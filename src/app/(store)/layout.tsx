import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const NAV = [
  { href: "/#fabric-lighting-cable", label: "Fabric cable" },
  { href: "/#ceramic-lights", label: "Ceramic lights" },
  { href: "/guides/choosing-fabric-lighting-cable", label: "How to choose" },
  { href: "/delivery-and-returns", label: "Delivery & returns" },
];

const FOOTER = [
  { href: "/delivery-and-returns", label: "Delivery and returns" },
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

const focus = "rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="bg-ink px-4 py-2 text-center text-[13px] font-medium text-page">
        Free UK delivery on every order · 30-day returns on unused items
      </p>
      <header className="border-b border-line bg-surface">
        {/* Phones: logo, then the menu as one row that scrolls sideways. Wider screens: one line. */}
        <div className="mx-auto flex max-w-[70rem] flex-col px-4 pt-2 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-5 sm:py-2.5">
          <Link href="/" className={`inline-flex min-h-12 items-center self-start ${focus}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt={`${SITE_NAME} home`} width={82} height={48} className="h-10 w-auto sm:h-12 dark:rounded dark:bg-white dark:p-1" />
          </Link>
          <nav aria-label="Main" className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <ul className="flex gap-x-6 whitespace-nowrap text-[15px] font-medium sm:gap-x-7">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={`inline-flex min-h-11 items-center hover:text-accent ${focus}`}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[70rem] px-4 pb-20 pt-4 sm:px-5 sm:pt-6">{children}</main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[70rem] flex-wrap items-center justify-between gap-x-8 gap-y-2 px-4 py-6 text-sm text-muted sm:px-5">
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-6">
              {FOOTER.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className={`inline-flex min-h-11 items-center text-ink underline-offset-2 hover:underline ${focus}`}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <p>
            © {new Date().getFullYear()} {SITE_NAME}. TheCable.Store is a trading name of Venture 58 Ltd, registered in
            England and Wales, company no. 14043490 · Secure payment by Stripe
          </p>
        </div>
      </footer>
    </>
  );
}
