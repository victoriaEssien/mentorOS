import { unsubscribeWithToken } from "@/server/email/preferences";

/**
 * One-click unsubscribe (RFC 8058). Mail apps POST here themselves when someone taps their own
 * "Unsubscribe" button, so it acts at once. The link in the email body goes to /unsubscribe
 * instead, which asks first: link scanners open links, and shouldn't unsubscribe anyone.
 */
export async function POST(request: Request) {
  const topic = await unsubscribeWithToken(new URL(request.url).searchParams.get("token") ?? "");
  return topic
    ? new Response(null, { status: 200 })
    : Response.json({ error: "Invalid link" }, { status: 400 });
}

/** A person who opened the header link lands on the page with the button. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  return Response.redirect(new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, url), 303);
}
