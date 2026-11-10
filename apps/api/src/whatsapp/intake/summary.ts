/**
 * Internal consultant summary. This module must not import the WhatsApp
 * sender, the Cloud client, or template helpers. It cannot send a message.
 */

const HELP = ['documents', 'process', 'viewing', 'listing', 'photos', 'ape', 'auction_process', 'other'] as const;
const URGENCY = ['auction_date_within_14d', 'none', 'unknown'] as const;
const FLAGS = [
  'valuation_asked',
  'financing_mentioned',
  'documents_offered',
  'specific_lot_analysis_asked',
  'distress',
  'out_of_scope',
] as const;

export type IntakeSummary = {
  summary_it: string;
  summary_en: string;
  answers_translated_it: Record<string, string>;
  stage: string | null;
  help_requested: string[];
  urgency: (typeof URGENCY)[number];
  customer_questions: string[];
  flags: string[];
};

export const SUMMARY_SYSTEM = [
  'You write an internal note for a human consultant at EasyCasa. You never write a message to the customer.',
  'Translate the answers into Italian. summary_it and summary_en are each at most 600 characters.',
  'Do not give a price, a value, a bid, or an opinion on whether to buy or sell.',
  'Do not infer nationality, religion, health, finances, or immigration status.',
  'If the customer mentioned income, a mortgage, a bank, or an amount of financing, set flags to include financing_mentioned and omit that content from summary_it, summary_en, answers_translated_it, and customer_questions.',
  'stage is one of the allowed stage ids you are given, or null.',
  'help_requested values must be from the allowed list. urgency is auction_date_within_14d, none, or unknown.',
  'flags only from: valuation_asked, financing_mentioned, documents_offered, specific_lot_analysis_asked, distress, out_of_scope.',
  'Reply with one JSON object and no other text.',
].join('\n');

export type SummaryInput = {
  route: string;
  locale: string;
  answers: Record<string, string>;
  stageIds: string[];
};

/** Drops the name and anything that is not a question answer. Phone numbers are not accepted here. */
export function summaryInput(input: SummaryInput): SummaryInput {
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.answers)) {
    if (key === 'close.name' || key === 'wa_id' || key === 'phone') continue;
    answers[key] = value;
  }
  return { route: input.route, locale: input.locale, answers, stageIds: input.stageIds };
}

export function summaryUserMessage(input: SummaryInput): string {
  const safe = summaryInput(input);
  return JSON.stringify({
    route: safe.route,
    locale: safe.locale,
    answers: safe.answers,
    stage_ids: safe.stageIds,
    help_requested_ids: HELP,
  });
}

function asStringArray(value: unknown, allowed?: readonly string[]): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') return null;
    if (allowed && !allowed.includes(item)) return null;
    out.push(item);
  }
  return out;
}

export function parseSummary(raw: string, stageIds: string[]): IntakeSummary | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const row = parsed as Record<string, unknown>;
  if (typeof row.summary_it !== 'string' || row.summary_it.length > 600) return null;
  if (typeof row.summary_en !== 'string' || row.summary_en.length > 600) return null;
  if (!row.answers_translated_it || typeof row.answers_translated_it !== 'object' || Array.isArray(row.answers_translated_it)) return null;
  const translated: Record<string, string> = {};
  for (const [key, value] of Object.entries(row.answers_translated_it as Record<string, unknown>)) {
    if (key === 'close.name') continue;
    if (typeof value !== 'string') return null;
    translated[key] = value;
  }
  const stage = row.stage == null ? null : typeof row.stage === 'string' && (row.stage === '' || stageIds.includes(row.stage)) ? row.stage || null : undefined;
  if (stage === undefined) return null;
  const help = asStringArray(row.help_requested, HELP);
  const questions = asStringArray(row.customer_questions);
  const flags = asStringArray(row.flags, FLAGS);
  if (!help || !questions || !flags) return null;
  if (typeof row.urgency !== 'string' || !URGENCY.includes(row.urgency as (typeof URGENCY)[number])) return null;
  const summary: IntakeSummary = {
    summary_it: row.summary_it,
    summary_en: row.summary_en,
    answers_translated_it: translated,
    stage,
    help_requested: help,
    urgency: row.urgency as IntakeSummary['urgency'],
    customer_questions: questions,
    flags,
  };
  if (summary.flags.includes('financing_mentioned')) {
    summary.answers_translated_it = {};
    summary.customer_questions = [];
    summary.summary_it = summary.summary_it.replace(/\d[\d.,]*/g, '').slice(0, 600);
    summary.summary_en = summary.summary_en.replace(/\d[\d.,]*/g, '').slice(0, 600);
  }
  return summary;
}
