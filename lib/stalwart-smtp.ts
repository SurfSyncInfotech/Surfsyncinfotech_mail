import nodemailer from "nodemailer";

export type StalwartSmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export function getStalwartSmtpConfig(): StalwartSmtpConfig | null {
  const host = process.env.STALWART_SMTP_HOST?.trim() ?? "";
  const username = process.env.STALWART_SMTP_USERNAME?.trim() ?? "";
  const password = process.env.STALWART_SMTP_PASSWORD ?? "";
  if (!host && !username && !password) return null;
  if (!host || !username || !password) {
    throw new Error("STALWART_SMTP_HOST, STALWART_SMTP_USERNAME, and STALWART_SMTP_PASSWORD must all be configured");
  }

  const port = Number(process.env.STALWART_SMTP_PORT || 587);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("STALWART_SMTP_PORT must be a valid TCP port");
  }

  return { host, port, username, password };
}

export async function sendStalwartSmtpEmail(
  config: StalwartSmtpConfig,
  message: { from: string; to: string; subject: string; text: string },
) {
  const secure = config.port === 465;
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure,
    requireTLS: !secure,
    auth: { user: config.username, pass: config.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { servername: config.host },
  });

  try {
    const result = await transporter.sendMail(message);
    const recipient = message.to.toLowerCase();
    const accepted = result.accepted.some((address) => address.toLowerCase() === recipient);
    if (!accepted) throw new Error("Stalwart did not accept the recipient");
    return { messageId: result.messageId };
  } finally {
    transporter.close();
  }
}
