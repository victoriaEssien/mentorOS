import "server-only";

/**
 * One look for every email: the grey desk, a white window with a plain title, a few short blocks,
 * at most one signal-yellow button, and a footer that says why it arrived. Tables and inline
 * styles, because that is what Gmail, Outlook and Apple Mail all render the same way. No images:
 * many inboxes block them, and the wordmark is set in type. Every value is escaped, since names and
 * titles come from learners and models.
 */

const INK = "#16181c";
const MUTED = "#565c66";
const DESK = "#eceef1";
const WINDOW = "#ffffff";
const RULE = "#d6dae0";
const SIGNAL = "#ffd23f";
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type Block =
  { kind: "text"; text: string } | { kind: "muted"; text: string } | { kind: "list"; items: string[] };

export type EmailContent = {
  /** The line inboxes show after the subject. */
  preheader: string;
  title: string;
  blocks: Block[];
  action?: { label: string; url: string };
  /** Smaller print under the button. */
  after?: Block[];
  /** Why this email arrived, in a sentence. */
  reason: string;
  /** For the emails someone can turn off. */
  unsubscribe?: { label: string; url: string; settingsUrl: string };
};

export function renderEmail(content: EmailContent): { html: string; text: string } {
  return { html: renderHtml(content), text: renderText(content) };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHtml(content: EmailContent): string {
  const block = (b: Block) => {
    if (b.kind === "list") {
      const items = b.items.map((item) => `<li style="margin:0 0 6px;">${escapeHtml(item)}</li>`).join("");
      return `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.55;color:${INK};">${items}</ul>`;
    }
    const color = b.kind === "muted" ? MUTED : INK;
    const size = b.kind === "muted" ? 13 : 15;
    return `<p style="margin:0 0 14px;font-size:${size}px;line-height:1.55;color:${color};">${escapeHtml(b.text)}</p>`;
  };

  const action = content.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 18px;">` +
      `<tr><td style="background:${SIGNAL};border-radius:8px;">` +
      `<a href="${escapeHtml(content.action.url)}" style="display:inline-block;padding:12px 20px;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};text-decoration:none;">${escapeHtml(content.action.label)}</a>` +
      `</td></tr></table>` +
      `<p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:${MUTED};">If the button doesn't work, paste this into your browser:<br>` +
      `<a href="${escapeHtml(content.action.url)}" style="color:${INK};word-break:break-all;">${escapeHtml(content.action.url)}</a></p>`
    : "";

  const unsubscribe = content.unsubscribe
    ? `<br><a href="${escapeHtml(content.unsubscribe.url)}" style="color:${MUTED};">${escapeHtml(content.unsubscribe.label)}</a>` +
      ` &middot; <a href="${escapeHtml(content.unsubscribe.settingsUrl)}" style="color:${MUTED};">Email settings</a>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${DESK};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${DESK};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:17px;font-weight:700;color:${INK};">mentor<span style="background:${SIGNAL};border-radius:4px;padding:1px 5px;margin-left:2px;">OS</span></td></tr>
<tr><td style="background:${WINDOW};border:1px solid ${RULE};border-radius:12px;padding:28px;font-family:${FONT};">
<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:700;color:${INK};">${escapeHtml(content.title)}</h1>
${content.blocks.map(block).join("\n")}
${action}
${(content.after ?? []).map(block).join("\n")}
</td></tr>
<tr><td style="padding:16px 4px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${MUTED};">${escapeHtml(content.reason)}${unsubscribe}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderText(content: EmailContent): string {
  const block = (b: Block) => (b.kind === "list" ? b.items.map((item) => `- ${item}`).join("\n") : b.text);
  const parts = [
    content.title,
    ...content.blocks.map(block),
    ...(content.action ? [`${content.action.label}: ${content.action.url}`] : []),
    ...(content.after ?? []).map(block),
    "--",
    content.reason,
    ...(content.unsubscribe
      ? [
          `${content.unsubscribe.label}: ${content.unsubscribe.url}`,
          `Email settings: ${content.unsubscribe.settingsUrl}`,
        ]
      : []),
  ];
  return parts.join("\n\n");
}
