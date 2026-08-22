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
      /System developed by <a href="https:\/\/www\.mundida\.com\/">MUNDIDA<\/a>/,
    );
    expect(html).not.toContain('Made with');
    expect(html).not.toContain('Powered by');
    expect(html).not.toContain('target="_blank"');
  });
});
