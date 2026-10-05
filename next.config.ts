import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Partial prerendering plus Activity: instant static shells, and tabs keep their state
  // (scroll, drafts) when you switch away and back, like a native app.
  cacheComponents: true,
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Source maps upload only when SENTRY_AUTH_TOKEN is present (i.e. on Vercel).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
