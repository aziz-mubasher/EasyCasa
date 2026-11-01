const ENABLED = process.env.NEXT_PUBLIC_WEB_ANALYTICS_ENABLED === 'true';

type Body = Record<string, unknown>;

export function analyticsBeaconEnabled(): boolean {
  if (!ENABLED || typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const host = window.location.hostname;
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.includes('preview') ||
    host.endsWith('.local')
  ) {
    return false;
  }
  if (document.cookie.split(';').some((part) => part.trim() === 'ec_staff=1')) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl === true || nav.doNotTrack === '1') return false;
  return true;
}

function post(body: Body): void {
  if (!analyticsBeaconEnabled()) return;
  const blob = new Blob([JSON.stringify(body)], { type: 'text/plain' });
  const ok = navigator.sendBeacon('/api/collect', blob);
  if (!ok) {
    void fetch('/api/collect', {
      method: 'POST',
      body: blob,
      keepalive: true,
      credentials: 'omit',
      mode: 'same-origin',
    });
  }
}

let entryPending = true;

function localeOf(pathname: string): string | undefined {
  const first = pathname.split('/').filter(Boolean)[0];
  return first === 'it' || first === 'en' || first === 'es' ? first : undefined;
}

function entryAttribution(search: string): Body {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const utm: Record<string, string> = {};
  for (const key of ['source', 'medium', 'campaign', 'content', 'term'] as const) {
    const value = q.get(`utm_${key}`);
    if (value) utm[key] = value;
  }
  const flags: Body = {};
  if (q.get('gclid') || q.get('gbraid') || q.get('wbraid')) flags.gclid = true;
  if (q.get('fbclid')) flags.fbclid = true;
  if (q.get('ttclid')) flags.ttclid = true;
  if (q.get('msclkid')) flags.msclkid = true;
  return {
    ref: document.referrer || undefined,
    utm: Object.keys(utm).length > 0 ? utm : undefined,
    ...flags,
  };
}

export function sendPageview(pathname: string, search: string): void {
  const body: Body = {
    t: 'pageview',
    p: pathname,
    l: localeOf(pathname),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    sw: window.innerWidth,
  };
  if (entryPending) {
    Object.assign(body, entryAttribution(search));
    entryPending = false;
  }
  post(body);
}

export function sendEvent(name: string, props?: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  post({
    t: 'event',
    p: window.location.pathname,
    l: localeOf(window.location.pathname),
    e: name,
    props,
  });
}

function scrollBucket(): number {
  const el = document.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  const pct = max <= 0 ? 100 : Math.round((window.scrollY / max) * 100);
  const steps = [0, 25, 50, 75, 100];
  let bucket = 0;
  for (const step of steps) if (pct >= step) bucket = step;
  return bucket;
}

export function bindEngage(pathname: string): () => void {
  let sent = false;
  let start = performance.now();
  let foreground = 0;
  let maxScroll = 0;
  const noteScroll = () => {
    const bucket = scrollBucket();
    if (bucket > maxScroll) maxScroll = bucket;
  };
  const flush = () => {
    if (sent) return;
    sent = true;
    if (document.visibilityState !== 'hidden') foreground += performance.now() - start;
    post({
      t: 'engage',
      p: pathname,
      l: localeOf(pathname),
      engagedMs: Math.max(0, Math.round(foreground)),
      scrollPct: maxScroll,
    });
  };
  const onVis = () => {
    const now = performance.now();
    if (document.visibilityState === 'hidden') {
      foreground += now - start;
      flush();
    } else {
      start = now;
    }
  };
  document.addEventListener('scroll', noteScroll, { passive: true });
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', flush);
  return () => {
    flush();
    document.removeEventListener('scroll', noteScroll);
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', flush);
  };
}

let clicksBound = false;
let addArmed = false;

export function bindClicks(): void {
  if (clicksBound || typeof document === 'undefined') return;
  clicksBound = true;
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      const href = anchor?.getAttribute('href') ?? '';
      if (href.startsWith('tel:')) sendEvent('phone.click');
      else if (href.startsWith('mailto:')) sendEvent('email.click');
      else if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) sendEvent('whatsapp.click');
    },
    true,
  );
  const opened = window.open.bind(window);
  window.open = (url?: string | URL, target?: string, features?: string) => {
    const value = typeof url === 'string' ? url : url instanceof URL ? url.href : '';
    if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(value)) sendEvent('whatsapp.click');
    return opened(url, target, features);
  };
}

export function armAddListing(pathname: string): void {
  if (addArmed || !/\/add\/?$/.test(pathname)) return;
  const fire = () => {
    if (addArmed) return;
    addArmed = true;
    sendEvent('seller.add_started');
    window.removeEventListener('pointerdown', fire, true);
    window.removeEventListener('keydown', fire, true);
  };
  window.addEventListener('pointerdown', fire, true);
  window.addEventListener('keydown', fire, true);
}
