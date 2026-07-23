import { createTransport } from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';

import type { ApiConfig } from '../config';
import { selectEmailProvider } from './email.module';
import { EmailService } from './email.service';
import type { EmailPort, EmailResult } from './email-port';
import { HttpEmailProvider } from './providers/http-email.provider';
import { NoopEmailProvider } from './providers/noop-email.provider';
import { SmtpEmailProvider } from './providers/smtp-email.provider';

const base = (over: Partial<ApiConfig>): ApiConfig =>
  ({ NOTIFY_FROM: 'EasyCasa <no-reply@easycasaita.com>', SMTP_URL: '', EMAIL_PROVIDER_URL: '', ...over }) as ApiConfig;

describe('provider selection (config-driven)', () => {
  it('SMTP_URL -> SmtpEmailProvider', () => {
    expect(selectEmailProvider(base({ SMTP_URL: 'smtp://localhost:25' }))).toBeInstanceOf(
      SmtpEmailProvider,
    );
  });
  it('EMAIL_PROVIDER_URL -> HttpEmailProvider', () => {
    expect(
      selectEmailProvider(base({ EMAIL_PROVIDER_URL: 'https://mail.example/send' })),
    ).toBeInstanceOf(HttpEmailProvider);
  });
  it('neither -> NoopEmailProvider (fail-soft)', () => {
    expect(selectEmailProvider(base({}))).toBeInstanceOf(NoopEmailProvider);
  });
  it('SMTP_URL takes precedence over EMAIL_PROVIDER_URL', () => {
    expect(
      selectEmailProvider(
        base({
          SMTP_URL: 'smtp://localhost:25',
          EMAIL_PROVIDER_URL: 'https://mail.example/send',
        }),
      ),
    ).toBeInstanceOf(SmtpEmailProvider);
  });
});

describe('SmtpEmailProvider (nodemailer jsonTransport - no network)', () => {
  it('composes and reports delivered', async () => {
    const transport = createTransport({ jsonTransport: true });
    const provider = new SmtpEmailProvider(transport, 'EasyCasa <no-reply@easycasaita.com>');
    const res = await provider.send({
      to: 'anna@e.it',
      subject: 'Ciao',
      text: 'corpo',
      html: '<b>corpo</b>',
    });
    expect(res.provider).toBe('smtp');
    expect(res.delivered).toBe(true);
    expect(res.id).toBeTruthy();
  });
});

describe('HttpEmailProvider (injected fetch)', () => {
  it('POSTs the message and returns the gateway id', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }),
    ) as unknown as typeof fetch;
    const provider = new HttpEmailProvider('https://mail.example/send', 'from@x', fetchImpl);
    const res = await provider.send({ to: 'a@b.it', subject: 'S', text: 'T' });
    expect(res).toMatchObject({ provider: 'http', delivered: true, id: 'msg_1' });
    const [, init] = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(JSON.parse(init.body).to).toBe('a@b.it');
  });
  it('throws on non-2xx', async () => {
    const fetchImpl = vi.fn(async () => new Response('nope', { status: 502 })) as unknown as typeof fetch;
    const provider = new HttpEmailProvider('https://mail.example/send', 'from@x', fetchImpl);
    await expect(provider.send({ to: 'a@b.it', subject: 'S', text: 'T' })).rejects.toThrow('502');
  });
});

describe('NoopEmailProvider', () => {
  it('skips (fail-soft)', async () => {
    const res = await new NoopEmailProvider().send({ to: 'a@b.it', subject: 'S', text: 'T' });
    expect(res).toMatchObject({ provider: 'noop', delivered: false, skipped: true });
  });
});

describe('EmailService (best-effort, template-driven)', () => {
  it('forwards a rendered template to the port', async () => {
    const sent: unknown[] = [];
    const port: EmailPort = {
      async send(m) {
        sent.push(m);
        return { provider: 'noop', delivered: true } as EmailResult;
      },
    };
    const svc = new EmailService(port);
    await svc.enquiryReceivedSeeker('anna@e.it', {
      seekerName: 'Anna',
      listingTitle: 'Bilocale',
      listingUrl: 'u',
    });
    expect((sent[0] as { to: string }).to).toBe('anna@e.it');
    expect((sent[0] as { subject: string }).subject).toContain('Bilocale');
    expect((sent[0] as { html: string }).html).toContain('Anna');
  });

  it('swallows provider errors so the primary request never breaks', async () => {
    const port: EmailPort = {
      async send() {
        throw new Error('smtp down');
      },
    };
    const svc = new EmailService(port);
    const res = await svc.viewingConfirmed('a@b.it', {
      seekerName: 'A',
      listingTitle: 'L',
      address: 'X',
      whenLocal: 'now',
    });
    expect(res.delivered).toBe(false);
  });
});
