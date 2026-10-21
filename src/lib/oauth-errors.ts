/**
 * What to tell someone whose Google or GitHub sign-in came back with an error. Better Auth sends
 * them to /sign-in with its own `error` code; "oauth" is ours, for a sign-in that never left the
 * app. Codes nobody needs to act on differently share one plain message.
 */
const MESSAGES: Record<string, string> = {
  // A mentorOS account already uses this email. Linking is refused while that account's email is
  // unverified, so nobody can claim an address they don't own by registering it first.
  account_not_linked:
    "You already have a mentorOS account with this email. Sign in with your email and password.",
  access_denied: "You cancelled the sign-in. Try again whenever you're ready, or use your email.",
  email_not_found:
    "That account didn't share an email address, so it can't sign you in. Use your email instead.",
};

const FALLBACK = "That sign-in didn't finish. Try again, or use your email.";

/** The message for the error in the sign-in URL, or null when there isn't one. */
export function oauthErrorMessage(error: string | string[] | undefined): string | null {
  const code = Array.isArray(error) ? error.at(-1) : error;
  if (!code) return null;
  return MESSAGES[code] ?? FALLBACK;
}
