import nodemailer from "nodemailer";

// Lazy-loaded SMTP transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === "true";
    const user = process.env.SMTP_USER || "larunkumar.co@gmail.com";
    const pass = process.env.SMTP_PASS || "ytyt kdet zvvd lqrh";

    transporter = nodemailer.createTransport({
      host,
      port,
      secure, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

const FROM_ADDRESS = process.env.SMTP_FROM || "Dayflow HRMS <larunkumar.co@gmail.com>";

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Generic mail sender wrapper with error catching
 */
export async function sendEmail({ to, subject, html, text }: SendMailOptions) {
  try {
    const transport = getTransporter();
    const info = await transport.sendMail({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
      text: text || subject,
      replyTo: "noreply@dayflow.internal",
    });

    console.log(`[EMAIL_SENT] ID: ${info.messageId} to: ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[EMAIL_SEND_ERROR]", error);
    return { success: false, error };
  }
}

/**
 * Security Login Alert Email sent when a user signs in
 */
export async function sendLoginAlertEmail({
  to,
  userName,
  employeeId,
  role,
  companyName = "Dayflow HRMS",
  ip = "Unknown IP",
  time = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "medium" }),
}: {
  to: string;
  userName: string;
  employeeId: string;
  role?: string;
  companyName?: string;
  ip?: string;
  time?: string;
}) {
  const subject = `🔐 Security Alert: New Sign-in to Dayflow HRMS (${employeeId})`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 28px; }
    .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
    .info-box { background: #f1f5f9; border-radius: 10px; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #cbd5e1; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; background: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; }
    .alert-banner { background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 6px; font-size: 12px; color: #065f46; margin: 16px 0; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${companyName}</h1>
      <p>Human Resource Management System</p>
    </div>
    <div class="content">
      <p class="greeting">Hello ${userName},</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        We detected a successful sign-in to your Dayflow HRMS account.
      </p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">User Name</span>
          <span class="value">${userName}</span>
        </div>
        <div class="info-row">
          <span class="label">Employee ID</span>
          <span class="value">${employeeId}</span>
        </div>
        <div class="info-row">
          <span class="label">Organization</span>
          <span class="value">${companyName}</span>
        </div>
        ${role ? `
        <div class="info-row">
          <span class="label">Account Role</span>
          <span class="value"><span class="badge">${role}</span></span>
        </div>` : ""}
        <div class="info-row">
          <span class="label">Timestamp (IST)</span>
          <span class="value">${time}</span>
        </div>
      </div>

      <div class="alert-banner">
        <strong>✓ Security Verification:</strong> If this was you, no action is needed. If you did not sign in, please notify your HR department immediately.
      </div>
    </div>
    <div class="footer">
      <p>This is an automated security message from Dayflow HRMS. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Welcome / Account Creation Email
 */
export async function sendWelcomeEmail({
  to,
  userName,
  employeeId,
  tempPassword,
  companyName = "Dayflow HRMS",
  loginUrl = "http://localhost:3000/login",
}: {
  to: string;
  userName: string;
  employeeId: string;
  tempPassword?: string;
  companyName?: string;
  loginUrl?: string;
}) {
  const subject = `🎉 Welcome to ${companyName} — Your HRMS Account is Ready`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .content { padding: 28px; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 20px 0; }
    .credentials { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 13px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to ${companyName}</h1>
    </div>
    <div class="content">
      <p style="font-size: 15px; font-weight: 600;">Hello ${userName},</p>
      <p style="font-size: 13px; color: #475569;">
        Your employee profile and HRMS account have been successfully created. You can now log in to track your attendance, manage leave requests, and view payslips.
      </p>

      <div class="credentials">
        <div><strong>Login ID:</strong> ${employeeId}</div>
        <div><strong>Email:</strong> ${to}</div>
        ${tempPassword ? `<div><strong>Temporary Password:</strong> ${tempPassword}</div>` : ""}
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn" style="color: #ffffff;">Sign In to Dayflow HRMS &rarr;</a>
      </div>
    </div>
    <div class="footer">
      <p>Automated onboarding message from ${companyName} HRMS.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}

/**
 * Onboarding Notification Alert sent to Organization Notification Email
 */
export async function sendOnboardingAdminAlertEmail({
  to,
  employeeName,
  employeeId,
  employeeEmail,
  department,
  designation,
  adminName,
  companyName = "Dayflow HRMS",
}: {
  to: string;
  employeeName: string;
  employeeId: string;
  employeeEmail: string;
  department?: string;
  designation?: string;
  adminName?: string;
  companyName?: string;
}) {
  const subject = `👥 New Employee Onboarded: ${employeeName} (${employeeId}) — ${companyName}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4f46e5, #4338ca); padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
    .content { padding: 24px; }
    .info-box { background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #cbd5e1; }
    .info-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Employee Onboarded</h1>
      <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">${companyName}</p>
    </div>
    <div class="content">
      <p style="font-size: 14px; font-weight: 600;">Hello HR Administrator,</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        A new team member was just onboarded into <strong>${companyName}</strong>${adminName ? ` by ${adminName}` : ""}.
      </p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">Employee Name</span>
          <span class="value">${employeeName}</span>
        </div>
        <div class="info-row">
          <span class="label">Login ID</span>
          <span class="value">${employeeId}</span>
        </div>
        <div class="info-row">
          <span class="label">Work Email</span>
          <span class="value">${employeeEmail}</span>
        </div>
        <div class="info-row">
          <span class="label">Department</span>
          <span class="value">${department || "—"}</span>
        </div>
        <div class="info-row">
          <span class="label">Designation</span>
          <span class="value">${designation || "—"}</span>
        </div>
        <div class="info-row">
          <span class="label">Onboarded At</span>
          <span class="value">${new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated notification from ${companyName} HRMS.</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({ to, subject, html });
}
