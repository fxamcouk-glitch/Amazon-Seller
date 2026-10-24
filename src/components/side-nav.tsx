"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Link2, ListChecks } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/listings", label: "Listings & SEO", icon: ListChecks },
  { href: "/admin/links", label: "Tracked links", icon: Link2 },
];

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="border-b border-line bg-surface md:w-56 md:shrink-0 md:border-b-0 md:border-r"
    >
      <p className="px-4 py-4 text-sm font-semibold md:py-6">The Cable Store</p>
      <ul className="flex flex-wrap gap-1 px-2 pb-2 md:flex-col md:pb-0">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent ${
                  active ? "bg-accent text-accent-ink" : "text-ink hover:bg-page"
                }`}
              >
                <Icon aria-hidden className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
