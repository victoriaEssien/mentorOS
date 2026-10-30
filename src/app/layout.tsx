import type { Metadata, Viewport } from "next";
import { Fira_Code, Fira_Sans } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Fira was drawn for Firefox OS, a phone operating system; Fira Code is the mono sibling
// developers already run in their editors. Body, display and data share one family.
const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "mentorOS", template: "%s · mentorOS" },
  description:
    "A technical mentor: a theme a week, a concept a day to explain in your own words, and a project to build.",
  applicationName: "mentorOS",
  appleWebApp: { capable: true, title: "mentorOS", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Edge to edge on notched phones; the shell pads itself with safe-area insets.
  viewportFit: "cover",
  // The on-screen keyboard shrinks the layout, so bottom-pinned composers stay visible.
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eceef1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Browser extensions add attributes to <html> and <body> before hydration.
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
