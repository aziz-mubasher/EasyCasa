import { describe, expect, it } from 'vitest';

import {
  composeSystemPrompt,
  composeUserPrompt,
  parseClaudeJsonObject,
  translateSystemPrompt,
  waAiForbiddenReason,
} from './whatsapp-ai.prompts';

describe('waAiForbiddenReason', () => {
  it('refuses T04 / reserved tokens', () => {
    expect(waAiForbiddenReason('Draft a proposta di acquisto for 180k')).toMatch(/row 11/);
    expect(waAiForbiddenReason('Ask for a caparra of 10k')).toMatch(/caparra/);
    expect(waAiForbiddenReason('Our provvigione is 3%')).toMatch(/provvigione/);
    expect(waAiForbiddenReason('Tell them the abuso is sanabile')).toMatch(/sanabilit/);
    expect(waAiForbiddenReason('Advise them to accept the price')).toMatch(/row 12/);
    expect(waAiForbiddenReason('Charge 2% of the sale')).toMatch(/percentage/);
  });

  it('allows viewing / search-preference prompts', () => {
    expect(
      waAiForbiddenReason('Ask for the city and price band they are looking for, then send the portal link'),
    ).toBeNull();
    expect(waAiForbiddenReason('Send the Easy Legenda first-file link')).toBeNull();
  });
});

describe('parseClaudeJsonObject', () => {
  it('reads fenced JSON and ignores preamble', () => {
    const parsed = parseClaudeJsonObject(
      'Sure.\n```json\n{"refused":false,"draft":"Ciao","reason":null}\n```',
    );
    expect(parsed).toEqual({ refused: false, draft: 'Ciao', reason: null });
  });

  it('returns null on plain text', () => {
    expect(parseClaudeJsonObject('Ciao, come posso aiutarti?')).toBeNull();
  });
});

describe('compose prompts', () => {
  it('names the target language and repeats T04 refusals', () => {
    const system = composeSystemPrompt('ur');
    expect(system).toContain('Urdu');
    expect(system).toContain('T04 row 12');
    expect(system).toContain('sanabilità');
    expect(system).not.toMatch(/provvigione on conclusion as a feature/i);

    const user = composeUserPrompt({
      locale: 'ur',
      prompt: 'Invite them to book a viewing in Brescia',
      thread: 'Customer: السلام علیکم',
    });
    expect(user).toContain('Invite them to book a viewing in Brescia');
    expect(user).toContain('Customer: السلام علیکم');
  });

  it('translate system stays extract-and-cite, not advice', () => {
    const system = translateSystemPrompt();
    expect(system).toContain('simple, plain English');
    expect(system).toContain('Do not add advice');
  });
});
