import nodemailer, { type Transporter } from "nodemailer";

const REQUIRED_VARS = [
  "EMAIL_HOST",
  "EMAIL_PORT",
  "EMAIL_USER",
  "EMAIL_PASSWORD",
] as const;

export class EmailConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Email is not configured. Missing environment variables: ${missing.join(", ")}`,
    );
    this.name = "EmailConfigError";
    this.missing = missing;
  }
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function readSmtpConfig(): SmtpConfig {
  const missing = REQUIRED_VARS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new EmailConfigError(missing);
  }

  const port = Number(process.env.EMAIL_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("EMAIL_PORT must be a valid TCP port number.");
  }

  const user = process.env.EMAIL_USER as string;
  const from =
    process.env.EMAIL_FROM?.trim() || `Adverito Projects <${user}>`;

  return {
    host: process.env.EMAIL_HOST as string,
    port,
    secure: port === 465,
    user,
    pass: process.env.EMAIL_PASSWORD as string,
    from,
  };
}

let sharedTransport: Transporter | null = null;
let sharedTransportKey = "";

function getTransport(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (sharedTransport && sharedTransportKey === key) {
    return sharedTransport;
  }
  sharedTransport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    logger: false,
  });
  sharedTransportKey = key;
  return sharedTransport;
}

function sanitize(error: unknown, password: string): string {
  const message =
    error instanceof Error ? error.message : String(error ?? "Unknown error");
  const withoutSecret = password
    ? message.split(password).join("[redacted]")
    : message;
  return withoutSecret.slice(0, 300);
}

export function isEmailConfigured(): boolean {
  return REQUIRED_VARS.every((name) => Boolean(process.env[name]?.trim()));
}

export async function verifyEmailConnection(): Promise<void> {
  const config = readSmtpConfig();
  try {
    await getTransport(config).verify();
  } catch (error) {
    throw new Error(`SMTP connection failed: ${sanitize(error, config.pass)}`);
  }
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ messageId: string | null }> {
  const config = readSmtpConfig();
  try {
    const info = await getTransport(config).sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: { "X-Priority": "3", "X-Mailer": "Adverito Invitations" },
    });
    return { messageId: info.messageId ?? null };
  } catch (error) {
    throw new Error(`SMTP send failed: ${sanitize(error, config.pass)}`);
  }
}
