import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/path", label: "Path" },
  { href: "/missions", label: "Missions" },
  { href: "/assessments", label: "Assessments" },
  { href: "/profile", label: "Profile" },
  { href: "/mentor", label: "Mentor" },
] as const;

export function AppNav() {
  return (
    <header className="border-b">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 px-8 py-4 text-sm">
        <Link href="/dashboard" className="font-semibold">
          mentorOS
        </Link>
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
            {link.label}
          </Link>
        ))}
        <Link href="/settings" className="ml-auto text-muted-foreground hover:text-foreground">
          Settings
        </Link>
      </nav>
    </header>
  );
}
