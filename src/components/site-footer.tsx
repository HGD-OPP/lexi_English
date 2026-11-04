import Link from "next/link";
import { AboutModal } from "./about-modal";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-faint">
            <span className="font-display text-lg text-ink">lexi.</span>{" "}
            把单词学成自己的。
          </p>

          <nav
            aria-label="页脚导航"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-faint"
          >
            <Link href="/" className="transition hover:text-ink">
              词书
            </Link>
            <Link href="/bookmarks" className="transition hover:text-ink">
              生词本
            </Link>
            <AboutModal />
            <a href="#" className="transition hover:text-ink">
              隐私政策
            </a>
            <a href="#" className="transition hover:text-ink">
              联系我们
            </a>
          </nav>
        </div>

        <div className="mt-6 flex flex-col gap-1.5 border-t border-line/50 pt-4 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 lexi. All rights reserved.</p>
          <p>
            Made with <span className="text-rose">❤️</span> by haoxuanhuang
          </p>
        </div>
      </div>
    </footer>
  );
}

