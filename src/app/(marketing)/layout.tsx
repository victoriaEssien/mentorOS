import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";
import { Button } from "@/components/ui/button";
import { LEGAL } from "@/lib/legal";

const FOOTER_LINK = "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

/** The public site: the landing page and the legal pages share one header and one footer. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="pressable rounded-sm text-xl outline-none focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Wordmark />
          </Link>
          <nav aria-label="Site" className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/#how-it-works">How it works</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-rule pb-safe">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 pt-10 pb-8 sm:px-8 md:grid-cols-[1fr_auto]">
          <div>
            <Wordmark className="text-base text-foreground" />
            <p className="mt-2 text-footnote text-muted-foreground">
              An AI-managed technical apprenticeship.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-12 text-footnote">
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Product</p>
              <Link href="/#how-it-works" className={FOOTER_LINK}>
                How it works
              </Link>
              <Link href="/sign-in" className={FOOTER_LINK}>
                Sign in
              </Link>
              <Link href="/sign-up" className={FOOTER_LINK}>
                Create an account
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Legal</p>
              <Link href="/privacy" className={FOOTER_LINK}>
                Privacy policy
              </Link>
              <Link href="/terms" className={FOOTER_LINK}>
                Terms of service
              </Link>
            </div>
          </nav>
          <p className="border-t border-rule pt-5 text-caption text-muted-foreground md:col-span-2">
            © 2026 {LEGAL.operator}
          </p>
        </div>
      </footer>
    </div>
  );
}
