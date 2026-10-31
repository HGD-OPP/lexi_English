"use client";

import { Bookmark, House } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "词书", icon: House },
  { href: "/bookmarks", label: "生词本", icon: Bookmark },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1" aria-label="主导航">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/" || pathname.startsWith("/books")
            : pathname.startsWith(link.href);
        const Icon = link.icon;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm transition ${
              active
                ? "bg-ink text-paper"
                : "text-ink-soft hover:bg-ink/5 hover:text-ink"
            }`}
          >
            <Icon className="size-4 sm:hidden" strokeWidth={1.8} />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
