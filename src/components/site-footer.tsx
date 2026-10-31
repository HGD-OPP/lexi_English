import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          <span className="font-display text-lg text-ink">lexi.</span>{" "}
          把单词学成自己的。
        </p>
        <div className="flex items-center gap-5">
          <Link href="/" className="transition hover:text-ink">
            词书
          </Link>
          <Link href="/bookmarks" className="transition hover:text-ink">
            生词本
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
            SM-2 inside
          </span>
        </div>
      </div>
    </footer>
  );
}
