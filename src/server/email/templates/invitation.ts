export interface InvitationEmailInput {
  ownerName: string;
  organizationName: string;
  activationUrl: string;
  expiresAt: Date;
  supportEmail: string;
  primaryColor: string | null;
  logoUrl: string | null;
  recipientEmail: string;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND_COLOR = "#465fff";
const BRAND_DARK = "#1e2a5c";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatExpiry(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

function colorOr(value: string | null | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

export function buildInvitationEmail(
  input: InvitationEmailInput,
): BuiltEmail {
  const accent = colorOr(input.primaryColor, BRAND_COLOR);
  const ownerName = escapeHtml(input.ownerName);
  const organizationName = escapeHtml(input.organizationName);
  const activationUrl = escapeHtml(input.activationUrl);
  const supportEmail = escapeHtml(input.supportEmail);
  const recipientEmail = escapeHtml(input.recipientEmail);
  const expiry = escapeHtml(formatExpiry(input.expiresAt));

  const logoHtml = input.logoUrl
    ? `<img src="${escapeHtml(input.logoUrl)}" alt="" width="40" height="40" style="display:block;border:0;border-radius:8px;" />`
    : `<span style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:8px;background:${accent};color:#ffffff;font-size:20px;font-weight:700;">A</span>`;

  const subject = `${input.organizationName} — activate your Adverito account`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#f4f5fa;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5fa;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:${BRAND_DARK};padding:24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td valign="middle" style="padding-inline-end:12px;">${logoHtml}</td>
                    <td valign="middle" style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.2px;">
                      Adverito<span style="color:${accent};">.</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;font-size:14px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">
                  Account invitation
                </p>
                <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:${BRAND_DARK};">
                  Welcome, ${ownerName}
                </h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                  <strong>${organizationName}</strong> has been set up for you on Adverito.
                  Activate your account to choose a password and sign in to your organization dashboard.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                  <tr>
                    <td style="background:${accent};border-radius:10px;">
                      <a href="${activationUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                        Activate your account
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:${accent};word-break:break-all;">
                  ${activationUrl}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                  <tr>
                    <td style="padding:16px;font-size:13px;line-height:1.6;color:#4b5563;">
                      <p style="margin:0 0 6px;"><strong>Organization:</strong> ${organizationName}</p>
                      <p style="margin:0 0 6px;"><strong>Expires:</strong> ${expiry} (72 hours after sending)</p>
                      <p style="margin:0;"><strong>Security:</strong> this link works once and is tied to your account. If you did not expect this invitation, you can ignore this email — no account will be activated.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb;padding:24px 32px;border-top:1px solid #e5e7eb;">
                <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6b7280;">
                  Sent by Adverito Projects to ${recipientEmail}.
                </p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280;">
                  Questions or trouble signing in? Contact
                  <a href="mailto:${supportEmail}" style="color:${accent};text-decoration:none;">${supportEmail}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Adverito Projects — account invitation",
    "",
    `Hi ${input.ownerName},`,
    "",
    `${input.organizationName} has been set up for you on Adverito.`,
    "Activate your account to choose a password and sign in to your organization dashboard.",
    "",
    `Activate your account: ${input.activationUrl}`,
    "",
    `Organization: ${input.organizationName}`,
    `Expires: ${formatExpiry(input.expiresAt)} (72 hours after sending)`,
    "Security: this link works once and is tied to your account.",
    "",
    `Sent by Adverito Projects to ${input.recipientEmail}.`,
    `Questions? Contact ${input.supportEmail}.`,
  ].join("\n");

  return { subject, html, text };
}
