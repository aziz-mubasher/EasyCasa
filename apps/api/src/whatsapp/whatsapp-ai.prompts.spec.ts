import { describe, expect, it } from 'vitest';

import {
  composeSystemPrompt,
  composeUserPrompt,
  creditRedirectDraft,
  isCreditAdviceDraft,
  isCreditTopicRefusal,
  operatorRequestsCreditAdvice,
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

  it('does not treat a mortgage mention as a hard refusal', () => {
    const reason =
      "Operator asks to request clarification, but customer's question is about mutuo (mortgage/credit advice), which is forbidden under T04 rules.";
    expect(isCreditTopicRefusal(reason)).toBe(true);
    expect(waAiForbiddenReason(reason)).toBeNull();
    expect(operatorRequestsCreditAdvice('what are you looking for?')).toBe(false);
    expect(operatorRequestsCreditAdvice('Can they get a mortgage while unemployed?')).toBe(true);
    expect(isCreditAdviceDraft(creditRedirectDraft('it'))).toBe(false);
    expect(isCreditAdviceDraft('Sì, puoi prendere un mutuo anche da disoccupato.')).toBe(true);
    expect(creditRedirectDraft('ur')).toContain('EasyCasa');
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
    expect(system).toContain('The operator note is the message');
    expect(system).not.toContain('mutuo / credit advice or lender routing');
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
