import { createTransport, type Transporter } from 'nodemailer';

import type { EmailMessage, EmailPort, EmailResult } from '../email-port';

/**
 * SMTP provider (nodemailer). Built from `SMTP_URL`. Transport is injectable
 * so tests can use jsonTransport without opening a socket.
 */
export class SmtpEmailProvider implements EmailPort {
  constructor(
    private readonly transport: Transporter,
    private readonly defaultFrom: string,
  ) {}

  static fromUrl(smtpUrl: string, defaultFrom: string): SmtpEmailProvider {
    return new SmtpEmailProvider(createTransport(smtpUrl), defaultFrom);
  }

  async send(msg: EmailMessage): Promise<EmailResult> {
    const info = await this.transport.sendMail({
      from: msg.from ?? this.defaultFrom,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    return { provider: 'smtp', delivered: true, id: (info as { messageId?: string }).messageId };
  }
}
