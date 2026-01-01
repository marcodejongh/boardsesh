import nodemailer, { Transporter } from 'nodemailer';
import { themeTokens } from '@/app/theme/theme-config';

// Email color palette derived from design tokens
// These are inline styles for HTML emails, so we extract the actual hex values
const emailColors = {
  primary: themeTokens.colors.primary, // Cyan primary
  textPrimary: themeTokens.neutral[800], // Dark text
  textSecondary: themeTokens.neutral[500], // Medium text
  textMuted: themeTokens.neutral[400], // Light text
  border: themeTokens.neutral[200], // Light border
} as const;

// Lazy-loaded transporter to avoid initialization at module load
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD environment variables.');
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.fastmail.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

// HTML escape function to prevent XSS
function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<void> {
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  const safeVerifyUrl = escapeHtml(verifyUrl);

  await getTransporter().sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Verify your Boardsesh email',
    html: `
      <div style="font-family: ${themeTokens.typography.fontFamily}; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${emailColors.primary}; margin-bottom: 24px;">Welcome to Boardsesh!</h1>
        <p style="color: ${emailColors.textPrimary}; font-size: 16px; line-height: 1.5;">
          Please verify your email address by clicking the button below:
        </p>
        <a href="${safeVerifyUrl}" style="
          display: inline-block;
          background-color: ${emailColors.primary};
          color: white;
          padding: 14px 28px;
          text-decoration: none;
          border-radius: ${themeTokens.borderRadius.md}px;
          margin: 24px 0;
          font-weight: ${themeTokens.typography.fontWeight.semibold};
          font-size: 16px;
        ">Verify Email</a>
        <p style="color: ${emailColors.textSecondary}; font-size: 14px; margin-top: 24px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="color: ${emailColors.primary}; font-size: 14px; word-break: break-all;">
          ${safeVerifyUrl}
        </p>
        <hr style="border: none; border-top: 1px solid ${emailColors.border}; margin: 32px 0;" />
        <p style="color: ${emailColors.textMuted}; font-size: 12px;">
          This link expires in 24 hours. If you didn't create a Boardsesh account, you can safely ignore this email.
        </p>
      </div>
    `,
    text: `Welcome to Boardsesh!\n\nPlease verify your email address by clicking this link:\n\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create a Boardsesh account, you can safely ignore this email.`,
  });
}
