/** A message to send. `html` is optional; `text` is always required (fallback). */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface EmailResult {
  provider: 'smtp' | 'http' | 'noop';
  delivered: boolean;
  /** true when no provider is configured — the send was intentionally skipped. */
  skipped?: boolean;
  id?: string;
}

/** The seam every caller depends on — never the concrete provider. */
export interface EmailPort {
  send(msg: EmailMessage): Promise<EmailResult>;
}

/** DI token for the selected EmailPort implementation. */
export const EMAIL_PORT = Symbol('EMAIL_PORT');
