import Link from "next/link";
import { redirect } from "next/navigation";

import { Wordmark } from "@/components/brand/wordmark";
import { getSession } from "@/lib/auth";

/**
 * Sign-in and sign-up. Full screen on phones; on larger screens the form sits in a login window
 * on the desk, the way a system presents its sign-in.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session) redirect("/today");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="pt-safe">
        <div className="mx-auto flex h-14 w-full max-w-md items-center px-5 sm:max-w-none sm:px-8">
          <Link href="/" className="text-lg outline-none focus-visible:outline-2 focus-visible:outline-ring">
            <Wordmark />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:justify-center sm:pt-0">
        <div className="sm:rounded-xl sm:border sm:border-rule sm:bg-window sm:p-8 sm:shadow-window">
          {children}
        </div>
      </main>
    </div>
  );
}
