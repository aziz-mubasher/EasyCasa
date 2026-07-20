import type { EmailMessage, EmailPort, EmailResult } from '../email-port';

/**
 * HTTP provider — POSTs to `EMAIL_PROVIDER_URL` (transactional gateway).
 * `fetchImpl` is injectable for testing.
 */
export class HttpEmailProvider implements EmailPort {
  constructor(
    private readonly endpoint: string,
    private readonly defaultFrom: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(msg: EmailMessage): Promise<EmailResult> {
    const res = await this.fetchImpl(this.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        from: msg.from ?? this.defaultFrom,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    });
    if (!res.ok) throw new Error(`email gateway ${res.status}`);
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { provider: 'http', delivered: true, id: body.id };
  }
}
