import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">mentorOS</h1>
      <p className="text-lg text-muted-foreground">
        A technical mentor that assesses you, finds your gaps, gives you things to build, evaluates what you
        produce, and decides what you should tackle next.
      </p>
      <div className="flex gap-3">
        <Link href="/sign-up" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Get started
        </Link>
        <Link href="/sign-in" className="rounded-md border px-4 py-2 text-sm">
          Sign in
        </Link>
      </div>
    </main>
  );
}
