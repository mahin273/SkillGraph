import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER && env.SMTP_PASS ? {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS
  } : undefined
});

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 0">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #dfe3ea;overflow:hidden">
          <!-- Header -->
          <tr>
            <td style="background:#17202a;padding:24px 32px;text-align:center">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.5px">SkillGraph</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f6f7f9;border-top:1px solid #edf0f5;text-align:center">
              <p style="margin:0;font-size:11px;color:#626f86">
                &copy; ${new Date().getFullYear()} SkillGraph &middot; Academic-to-Industry Career GPS
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(to: string, fullName: string, verificationToken: string): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/login?verify=${verificationToken}`;
  
  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#17202a">Verify Your Email</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#44546f;line-height:1.6">
      Hi <strong>${fullName}</strong>, welcome to SkillGraph! Please verify your email address by using the code below or clicking the button.
    </p>
    <div style="background:#e9f2ff;border:1px solid #cce0ff;border-radius:8px;padding:16px;text-align:center;margin:0 0 20px">
      <p style="margin:0 0 4px;font-size:11px;color:#626f86;text-transform:uppercase;letter-spacing:1px;font-weight:600">Verification Code</p>
      <p style="margin:0;font-size:16px;font-family:monospace;color:#0c66e4;font-weight:700;word-break:break-all">${verificationToken}</p>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${verifyUrl}" style="display:inline-block;background:#0c66e4;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
            Verify Email Address
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#626f86">
      This link expires in 24 hours. If you didn't create a SkillGraph account, you can safely ignore this email.
    </p>`;

  const html = wrapHtml("Verify Your Email — SkillGraph", body);

  try {
    await transporter.sendMail({
      from: `"SkillGraph" <${env.SMTP_FROM}>`,
      to,
      subject: "Verify your email address — SkillGraph",
      html
    });
    console.log(`[email] Verification email sent to ${to}`);
  } catch (err) {
    console.error(`[email] Failed to send verification email to ${to}:`, err);
  }
}

export async function sendInvitationEmail(
  to: string,
  role: string,
  universityName: string,
  inviteToken: string,
  invitedBy?: string
): Promise<void> {
  const signupUrl = `${env.FRONTEND_URL}/signup?invite=${inviteToken}`;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#17202a">You're Invited to SkillGraph</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#44546f;line-height:1.6">
      ${invitedBy ? `<strong>${invitedBy}</strong> has` : "Your university administrator has"} invited you to join <strong>${universityName}</strong> on SkillGraph as a <strong>${roleLabel}</strong>.
    </p>
    <div style="background:#e7f8ef;border:1px solid #cfecdc;border-radius:8px;padding:16px;margin:0 0 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:#626f86;padding:4px 0"><strong>University:</strong></td>
          <td style="font-size:12px;color:#17202a;padding:4px 0">${universityName}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#626f86;padding:4px 0"><strong>Role:</strong></td>
          <td style="font-size:12px;color:#17202a;padding:4px 0">${roleLabel}</td>
        </tr>
        <tr>
          <td style="font-size:12px;color:#626f86;padding:4px 0"><strong>Expires:</strong></td>
          <td style="font-size:12px;color:#17202a;padding:4px 0">7 days from now</td>
        </tr>
      </table>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${signupUrl}" style="display:inline-block;background:#0c66e4;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
            Accept Invitation & Sign Up
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#626f86">
      This invitation link expires in 7 days. If you did not expect this invitation, you can safely ignore this email.
    </p>`;

  const html = wrapHtml(`You're Invited to ${universityName} — SkillGraph`, body);

  try {
    await transporter.sendMail({
      from: `"SkillGraph" <${env.SMTP_FROM}>`,
      to,
      subject: `You're invited to join ${universityName} on SkillGraph`,
      html
    });
    console.log(`[email] Invitation email sent to ${to}`);
  } catch (err) {
    console.error(`[email] Failed to send invitation email to ${to}:`, err);
  }
}

export async function sendApprovalEmail(to: string, fullName: string, universityName: string): Promise<void> {
  const loginUrl = `${env.FRONTEND_URL}/login`;

  const body = `
    <h2 style="margin:0 0 16px;font-size:20px;color:#17202a">Account Approved! 🎉</h2>
    <p style="margin:0 0 16px;font-size:14px;color:#44546f;line-height:1.6">
      Hi <strong>${fullName}</strong>, great news! Your registration at <strong>${universityName}</strong> has been reviewed and approved by your university administrator.
    </p>
    <p style="margin:0 0 20px;font-size:14px;color:#44546f;line-height:1.6">
      You now have full access to the SkillGraph platform, including student directories, analytics, and mentoring tools.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="${loginUrl}" style="display:inline-block;background:#1f845a;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">
            Log In to SkillGraph
          </a>
        </td>
      </tr>
    </table>`;

  const html = wrapHtml("Account Approved — SkillGraph", body);

  try {
    await transporter.sendMail({
      from: `"SkillGraph" <${env.SMTP_FROM}>`,
      to,
      subject: `Your SkillGraph account has been approved — ${universityName}`,
      html
    });
    console.log(`[email] Approval email sent to ${to}`);
  } catch (err) {
    console.error(`[email] Failed to send approval email to ${to}:`, err);
  }
}