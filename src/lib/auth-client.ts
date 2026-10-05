import { createAuthClient } from "better-auth/react";

import { publicEnv } from "@/lib/public-env";

export const authClient = createAuthClient({
  baseURL: publicEnv.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
