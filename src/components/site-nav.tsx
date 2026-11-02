"use client";

import { Bookmark, House, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "词书", icon: House },
  { href: "/bookmarks", label: "生词本", icon: Bookmark },
  { href: "/dashboard", label: "个人中心", icon: UserRound },
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
            aria-label={link.label}
            className={`inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-sm transition sm:px-3 ${
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
