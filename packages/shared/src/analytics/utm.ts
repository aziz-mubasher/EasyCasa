const CONTROL = /[\u0000-\u001F\u007F]/g;

/** Lowercase, strip controls, cap at 100. Reject emails and long digit runs. */
export function cleanUtm(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase().replace(CONTROL, '');
  if (!cleaned) return null;
  const clipped = cleaned.length > 100 ? cleaned.slice(0, 100) : cleaned;
  if (clipped.includes('@')) return null;
  if (/\d{7,}/.test(clipped)) return null;
  return clipped;
}

export type ClickFlag = 'google_ads' | 'meta' | 'tiktok' | 'bing';

function present(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string' && value.trim().length > 0) return true;
  return false;
}

/**
 * Presence only. The click-id value is a join key to an ad platform and is never returned.
 */
export function clickFlagFrom(input: Record<string, unknown> | null | undefined): ClickFlag | null {
  if (!input) return null;
  if (present(input.gclid) || present(input.gbraid) || present(input.wbraid)) return 'google_ads';
  if (present(input.fbclid)) return 'meta';
  if (present(input.ttclid)) return 'tiktok';
  if (present(input.msclkid)) return 'bing';
  return null;
}

export function referrerHost(ref: unknown, siteHost = 'easycasaita.com'): string | null {
  if (typeof ref !== 'string' || !ref.trim()) return null;
  try {
    const host = new URL(ref).hostname.toLowerCase().replace(/\.$/, '');
    if (!host) return null;
    if (host === siteHost || host.endsWith(`.${siteHost}`)) return null;
    return host.slice(0, 100);
  } catch {
    return null;
  }
}

export function screenBucket(sw: unknown): '<480' | '480-1024' | '>1024' | null {
  const n = typeof sw === 'number' ? sw : typeof sw === 'string' ? Number(sw) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 10000) return null;
  if (n < 480) return '<480';
  if (n <= 1024) return '480-1024';
  return '>1024';
}

const SOURCE = /^(meta|google|tiktok|whatsapp|brevo|homio|qr_[a-z0-9_]+|partner_[a-z0-9_]+)$/;
const MEDIUM = /^(paid_social|cpc|email|whatsapp|qr|referral|organic_social)$/;
const CAMPAIGN = /^(ec|el)_[a-z0-9_]+_[0-9]{6}$/;
const CONTENT = /^[a-z0-9_]+$/;

export function utmConventionError(input: {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}): string | null {
  const source = cleanUtm(input.source ?? '');
  const medium = cleanUtm(input.medium ?? '');
  const campaign = cleanUtm(input.campaign ?? '');
  const content = input.content ? cleanUtm(input.content) : null;
  if (!source || !SOURCE.test(source)) return 'utm_source';
  if (!medium || !MEDIUM.test(medium)) return 'utm_medium';
  if (!campaign || !CAMPAIGN.test(campaign)) return 'utm_campaign';
  if (input.content && (!content || !CONTENT.test(content))) return 'utm_content';
  return null;
}

export function buildCampaignUrl(input: {
  base: string;
  source: string;
  medium: string;
  campaign: string;
  content?: string;
}): string | null {
  if (utmConventionError(input)) return null;
  let url: URL;
  try {
    url = new URL(input.base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  url.searchParams.set('utm_source', cleanUtm(input.source)!);
  url.searchParams.set('utm_medium', cleanUtm(input.medium)!);
  url.searchParams.set('utm_campaign', cleanUtm(input.campaign)!);
  const content = input.content ? cleanUtm(input.content) : null;
  if (content) url.searchParams.set('utm_content', content);
  return url.toString();
}
