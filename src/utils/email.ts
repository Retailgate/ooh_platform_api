import nodemailer from "nodemailer";
import * as config from "../config/config";

export const transporter = nodemailer.createTransport({
  host: config.env.SMTP_HOST,
  port: Number(config.env.SMTP_PORT),
  secure: false, // true if using 465
  auth: {
    user: config.env.SMTP_USER,
    pass: config.env.SMTP_PASS,
  },
});

export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log("SMTP connection established");
  } catch (error) {
    console.error("SMTP connection failed:", error);
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const info = await transporter.sendMail({
    from: config.env.SMTP_FROM,
    to,
    subject,
    text,
    html,
  });

  return info;
}
