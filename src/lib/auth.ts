import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

/**
 * Better Auth server instance.
 * Email/password is on by default. OAuth providers switch on when their env vars are present.
 */
export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET } }
      : {}),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            // Let people with more than one Google account choose, instead of using whichever is open.
            prompt: "select_account" as const,
          },
        }
      : {}),
  },
  // nextCookies must stay last so cookies set in server actions reach the browser.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;

/** Social providers that are switched on, in the order their buttons appear. */
export const socialProviders = (["github", "google"] as const).filter((provider) =>
  provider === "github"
    ? Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
    : Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
);

export type SocialProvider = (typeof socialProviders)[number];

/**
 * Current session in a server component, server action or route handler. Null when signed out.
 * Memoised per request, so every component on a page shares one lookup.
 */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
