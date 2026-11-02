import { LogIn } from "lucide-react";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteNav } from "@/components/site-nav";
import type { Viewer } from "@/lib/types";

export function SiteHeader({ viewer }: { viewer: Viewer | null }) {
  const initial =
    viewer?.name?.trim().charAt(0).toUpperCase() ||
    viewer?.email.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
          aria-label="Lexi 首页"
        >
          <span className="relative grid size-8 place-items-center rounded-xl bg-ink text-paper shadow-sm transition group-hover:-rotate-3">
            <span className="font-display text-lg leading-none">l</span>
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-lime" />
          </span>
          <span className="font-display text-2xl tracking-tight">
            lexi<span className="text-moss">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <SiteNav />
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          {viewer ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard"
                aria-label="打开个人中心"
                className="hidden size-9 place-items-center rounded-full border border-moss/15 bg-lime font-display text-base text-moss-deep transition hover:border-moss/35 hover:bg-lime/80 sm:grid"
                title={viewer.email}
              >
                {initial}
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-ink px-4 text-sm text-paper transition hover:bg-moss-deep"
            >
              <LogIn className="size-4" strokeWidth={1.8} />
              <span>登录</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
