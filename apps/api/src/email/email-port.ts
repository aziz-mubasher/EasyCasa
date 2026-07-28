/** A message to send. `text` is always required (fallback). */
export interface EmailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  attachments?: EmailAttachment[];
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
