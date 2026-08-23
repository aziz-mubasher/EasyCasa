import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  MUNDIDA_DEV_CREDIT_PREFIX,
  MUNDIDA_DEV_CREDIT_URL,
  MundidaDevCredit,
} from './MundidaDevCredit';

describe('MundidaDevCredit', () => {
  it('renders the exact English line with only MUNDIDA linked', () => {
    const html = renderToStaticMarkup(<MundidaDevCredit className="credit" />);
    expect(html).toContain(MUNDIDA_DEV_CREDIT_PREFIX);
    expect(html).toContain(`href="${MUNDIDA_DEV_CREDIT_URL}"`);
    expect(html).toMatch(
      /Made with ❤️ in Italy by <a href="https:\/\/www\.mundida\.com\/">MUNDIDA<\/a>/,
    );
    expect(html).not.toContain('System developed by');
    expect(html).not.toContain('Fatto con');
    expect(html).not.toContain('Hecho con');
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('utm_');
  });

  it('can sit on the copyright bar after a middot', () => {
    const html = renderToStaticMarkup(
      <MundidaDevCredit inline leadingMiddot className="credit" />,
    );
    expect(html.startsWith('<span')).toBe(true);
    expect(html).toContain(' · Made with ❤️ in Italy by ');
  });
});
