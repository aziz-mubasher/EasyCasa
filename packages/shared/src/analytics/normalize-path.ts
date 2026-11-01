const LOCALES = new Set(['it', 'en', 'es']);
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Browser paths that rewrite onto another folder. Kept as their own templates. */
const ALIAS_TEMPLATES = new Set([
  '/sell-privately',
  '/vender-entre-particulares',
  '/vender-como-particular',
  '/transparency',
  '/contact',
]);

/**
 * Static templates derived from apps/web/app page routes (locale prefix stripped).
 * The route-coverage test fails when a new page folder is not listed here.
 */
export const STATIC_PATH_TEMPLATES = [
  '/',
  '/about',
  '/account',
  '/acquisto-assistito',
  '/add',
  '/admin/assignments',
  '/admin/credential-policy',
  '/admin/legal-basis',
  '/admin/professionals',
  '/agenzie',
  '/aste',
  '/aste/analisi',
  '/aste/guida',
  '/aste/lab',
  '/auth/callback',
  '/banks4all',
  '/contatti',
  '/favorites',
  '/for-buyers',
  '/hi/prenota-chiamata',
  '/i-miei-dati',
  '/imports/casafari',
  '/legal/mediation',
  '/legal/privacy',
  '/legal/terms',
  '/mediazione-e-provvigione',
  '/owner',
  '/pagamento/annullato',
  '/pagamento/checkout',
  '/pagamento/successo',
  '/partner-directory',
  '/prenota-chiamata',
  '/pricing',
  '/privacy',
  '/search',
  '/seller/enquiries',
  '/seller/list',
  '/seller/listings',
  '/seller/onboarding',
  '/seller/viewings',
  '/termini',
  '/trasparenza',
  '/ur/prenota-chiamata',
  '/valutazione-gratuita',
  '/vendi-da-privato',
  '/viewings',
  '/viewings/conducting',
  ...ALIAS_TEMPLATES,
] as const;

const STATIC = new Set<string>(STATIC_PATH_TEMPLATES);

export const SELLER_LANDING_TEMPLATES = new Set([
  '/vendi-da-privato',
  '/sell-privately',
  '/vender-entre-particulares',
  '/vender-como-particular',
  '/pricing',
]);

export type NormalizedPath = {
  template: string;
  locale: 'it' | 'en' | 'es' | null;
  entityId: string | null;
};

function join(parts: string[]): string {
  return `/${parts.join('/')}`;
}

/**
 * Allow-list path normaliser. Anything unknown becomes `/:other`.
 * Share tokens, analysis ids and payment ids are never returned as entityId.
 * entityId is set only for `/listings/:id` when the segment is a UUID.
 */
export function normalizePath(pathname: string): NormalizedPath {
  const bare = pathname.split('?')[0]?.split('#')[0] ?? '';
  const rawParts = bare.split('/').filter(Boolean);
  let locale: NormalizedPath['locale'] = null;
  const parts = [...rawParts];
  if (parts[0] && LOCALES.has(parts[0])) {
    locale = parts[0] as NormalizedPath['locale'];
    parts.shift();
  }
  if (parts.length === 0) return { template: '/', locale, entityId: null };

  const decoded = parts.map((p) => {
    try {
      return decodeURIComponent(p);
    } catch {
      return p;
    }
  });

  const template = matchTemplate(decoded);
  const entityId =
    template === '/listings/:id' && decoded[1] && UUID_RE.test(decoded[1]) ? decoded[1].toLowerCase() : null;
  return { template, locale, entityId };
}

function matchTemplate(parts: string[]): string {
  const path = join(parts);
  if (STATIC.has(path)) return path;

  if (parts[0] === 's' && parts.length === 2) return '/s/:token';
  if (parts[0] === 'listing' && parts.length === 2) return '/listing/:id';

  if (parts[0] === 'listings' && parts.length === 2) return '/listings/:id';
  if (parts[0] === 'listings' && parts.length === 3 && (parts[2] === 'availability' || parts[2] === 'book')) {
    return `/listings/:id/${parts[2]}`;
  }

  if (parts[0] === 'aste' && parts[1] === 'analisi' && parts.length === 3) return '/aste/analisi/:id';
  if (parts[0] === 'aste' && parts[1] === 'analisi' && parts[2] && parts[3] === 'report' && parts.length === 4) {
    return '/aste/analisi/:id/report';
  }
  if (parts[0] === 'aste' && parts[1] === 'report' && parts.length === 3) return '/aste/report/:id';

  if (parts[0] === 'seller' && parts[1] === 'listings' && parts.length === 3) return '/seller/listings/:id';
  if (
    parts[0] === 'seller' &&
    parts[1] === 'listings' &&
    parts.length === 4 &&
    ['analytics', 'availability', 'documents', 'verification'].includes(parts[3]!)
  ) {
    return `/seller/listings/:id/${parts[3]}`;
  }

  if (parts[0] === 'owner' && parts[1] === 'properties' && parts[3] === 'fascicolo' && parts.length === 4) {
    return '/owner/properties/:id/fascicolo';
  }

  if (parts[0] === 'viewings' && parts.length === 2 && parts[1] !== 'conducting') return '/viewings/:id';

  if (parts[0] === 'pagamento' && parts.length >= 2) return '/pagamento/:other';
  if (parts[0] === 'account') return '/account';
  if (parts[0] === 'i-miei-dati') return '/i-miei-dati';

  return '/:other';
}

/** Concrete sample path for a Next page file, used by the route-coverage test. */
export function samplePathForPageFile(rel: string): { pathname: string; template: string } | null {
  const norm = rel.replace(/\\/g, '/');
  if (!norm.endsWith('/page.tsx') && !norm.endsWith('/page.ts')) return null;
  let rest = norm.replace(/^app\//, '').replace(/\/page\.tsx$/, '').replace(/\/page\.ts$/, '');
  if (rest === 'page.tsx' || rest === '') return { pathname: '/it', template: '/' };
  const parts = rest.split('/').filter(Boolean);
  const underLocale = parts[0] === '[locale]';
  if (underLocale) parts.shift();
  const templateParts = parts.map((p) => {
    if (p === '[slug]' || p === '[id]') return ':id';
    if (p === '[token]') return ':token';
    if (p.startsWith('[') && p.endsWith(']')) return `:${p.slice(1, -1)}`;
    return p;
  });
  const template = templateParts.length === 0 ? '/' : `/${templateParts.join('/')}`;
  const sampleParts = parts.map((p) => {
    if (p === '[slug]' || p === '[id]') return '11111111-1111-4111-8111-111111111111';
    if (p === '[token]') return 'sharetoken';
    if (p.startsWith('[') && p.endsWith(']')) return 'x';
    return p;
  });
  const tail = sampleParts.length ? `/${sampleParts.join('/')}` : '';
  const pathname = underLocale ? `/it${tail || ''}` : tail || '/';
  return { pathname, template };
}
