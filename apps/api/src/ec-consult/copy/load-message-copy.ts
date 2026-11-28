import messageCopy from '../fixtures/message-copy.fixture.json';

export type MessageCopyFixture = {
  message1: string;
  it: string;
  en: string;
  es: string;
  fr: string;
  ro: string;
  ur: string;
  pnb: string;
  pa: string;
  hi: string;
  bn: string;
  ar: string;
  ru: string;
};

let cached: MessageCopyFixture | null = null;

export function loadMessageCopyFixture(): MessageCopyFixture {
  if (cached) return cached;
  cached = messageCopy as MessageCopyFixture;
  return cached;
}

export function message1Text(): string {
  return loadMessageCopyFixture().message1;
}

export function message2ForLocale(locale: string): string | null {
  const pack = loadMessageCopyFixture();
  const key = locale as keyof MessageCopyFixture;
  if (key === 'message1') return null;
  const text = pack[key];
  return typeof text === 'string' && text.trim() ? text : null;
}