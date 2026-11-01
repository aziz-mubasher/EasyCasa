import type { ClickFlag } from './utm';

export const ANALYTICS_CHANNELS = [
  'Paid Search',
  'Paid Social',
  'Email',
  'WhatsApp',
  'Partner',
  'Offline',
  'Organic Search',
  'Organic Social',
  'AI Assistants',
  'Portals',
  'Referral',
  'Direct',
] as const;

export type AnalyticsChannel = (typeof ANALYTICS_CHANNELS)[number];

function hostEnds(host: string, root: string): boolean {
  return host === root || host.endsWith(`.${root}`);
}

function isGoogleHost(host: string): boolean {
  return hostEnds(host, 'google.com') || /(^|\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
}

const SEARCH = ['bing.com', 'duckduckgo.com', 'ecosia.org', 'yahoo.com', 'qwant.com'];
const SOCIAL = [
  'facebook.com',
  'instagram.com',
  'l.facebook.com',
  'lm.facebook.com',
  't.co',
  'x.com',
  'linkedin.com',
  'tiktok.com',
  'youtube.com',
  'pinterest.com',
];
const AI = [
  'chatgpt.com',
  'chat.openai.com',
  'perplexity.ai',
  'claude.ai',
  'gemini.google.com',
  'copilot.microsoft.com',
];
const PORTALS = ['immobiliare.it', 'idealista.it', 'casa.it', 'subito.it'];

export function classifyChannel(input: {
  clickFlag?: ClickFlag | null;
  utmMedium?: string | null;
  utmSource?: string | null;
  referrerHost?: string | null;
}): AnalyticsChannel {
  const flag = input.clickFlag ?? null;
  if (flag === 'google_ads' || flag === 'bing') return 'Paid Search';
  if (flag === 'meta' || flag === 'tiktok') return 'Paid Social';

  const medium = (input.utmMedium ?? '').toLowerCase();
  const source = (input.utmSource ?? '').toLowerCase();
  if (medium === 'cpc' || medium === 'ppc' || medium === 'paid' || medium === 'paid_search') {
    return 'Paid Search';
  }
  if (medium === 'paid_social' || medium === 'social_paid') return 'Paid Social';
  if (medium === 'email' || medium === 'newsletter') return 'Email';
  if (medium === 'whatsapp' || source === 'whatsapp') return 'WhatsApp';
  if (medium === 'affiliate' || medium === 'partner') return 'Partner';
  if (medium === 'qr' || medium === 'print' || medium === 'offline') return 'Offline';

  const host = (input.referrerHost ?? '').toLowerCase();
  if (host) {
    // AI hosts before generic google.* so gemini.google.com is not Organic Search.
    if (AI.some((root) => host === root || hostEnds(host, root))) return 'AI Assistants';
    if (isGoogleHost(host) || SEARCH.some((root) => hostEnds(host, root))) return 'Organic Search';
    if (SOCIAL.some((root) => hostEnds(host, root))) return 'Organic Social';
    if (PORTALS.some((root) => hostEnds(host, root))) return 'Portals';
    return 'Referral';
  }
  return 'Direct';
}
