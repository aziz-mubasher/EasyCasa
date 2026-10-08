/**
 * Pure session transitions for EC-APP-1.
 * Login, logout, role and the publish draft live here so the screens stay thin.
 */

export type AppRole = 'seeker' | 'seller';

export type Account =
  | { kind: 'guest' }
  | { kind: 'member'; source: 'oidc' | 'device'; email: string | null; name: string };

export type DiscoveryQuery = {
  text: string;
  dealType: 'sale' | 'rent';
  priceMaxEur: number | null;
  minRooms: number | null;
  energy: string[];
  seller: 'all' | 'private' | 'agency';
  features: string[];
};

export type PublishDraft = {
  type: string;
  title: string;
  city: string;
  energyClass: string;
  energyIndex: string;
  price: string;
  photos: number;
  description: string;
  terms: boolean;
};

export type SavedSearch = {
  id: string;
  title: string;
  detail: string;
  fresh: number;
};

export type FlowState = {
  welcomeSeen: boolean;
  role: AppRole | null;
  account: Account;
  returnTo: string | null;
  discovery: DiscoveryQuery;
  publish: PublishDraft;
  savedSearches: SavedSearch[];
  notificationsAsked: boolean;
  locationAsked: boolean;
  photosAllowed: boolean;
  enquirySent: boolean;
};

export const initialPublish = (): PublishDraft => ({
  type: 'apartment',
  title: '',
  city: 'Brescia',
  energyClass: '',
  energyIndex: '',
  price: '',
  photos: 0,
  description: '',
  terms: false,
});

export const initialDiscovery = (): DiscoveryQuery => ({
  text: 'Brescia',
  dealType: 'sale',
  priceMaxEur: null,
  minRooms: null,
  energy: [],
  seller: 'all',
  features: [],
});

export const initialFlowState = (): FlowState => ({
  welcomeSeen: false,
  role: null,
  account: { kind: 'guest' },
  returnTo: null,
  discovery: initialDiscovery(),
  publish: initialPublish(),
  savedSearches: [],
  notificationsAsked: false,
  locationAsked: false,
  photosAllowed: false,
  enquirySent: false,
});

export function isMember(account: Account): boolean {
  return account.kind === 'member';
}

/** Energy class and index are required before an announcement can be published. */
export function publishReady(draft: PublishDraft): boolean {
  return publishBlocker(draft) === null;
}

/** Why publish is still off, or null when the draft can go online. */
export function publishBlocker(draft: PublishDraft): string | null {
  if (draft.title.trim().length === 0) return 'Aggiungi il titolo per pubblicare';
  if (draft.energyClass.trim().length === 0 || draft.energyIndex.trim().length === 0) {
    return 'Completa il passo 3 per pubblicare';
  }
  if (!draft.terms) return 'Accetta i termini per pubblicare';
  return null;
}

export function chooseRole(state: FlowState, role: AppRole): FlowState {
  return { ...state, welcomeSeen: true, role };
}

export function signInAccount(
  state: FlowState,
  source: 'oidc' | 'device',
  profile?: { email?: string | null; name?: string | null },
): FlowState {
  return {
    ...state,
    account: {
      kind: 'member',
      source,
      email: profile?.email ?? null,
      name: profile?.name?.trim() || 'Account',
    },
  };
}

/** Logout returns the guest seeker shell. Drafts stay on the device. */
export function signOutAccount(state: FlowState): FlowState {
  return {
    ...state,
    account: { kind: 'guest' },
    role: state.role ?? 'seeker',
    returnTo: null,
  };
}

export function withReturnTo(state: FlowState, returnTo: string | null): FlowState {
  return { ...state, returnTo };
}

export function activeFilterCount(q: DiscoveryQuery): number {
  let n = 0;
  if (q.dealType === 'rent') n += 1;
  if (q.priceMaxEur != null) n += 1;
  if (q.minRooms != null) n += 1;
  if (q.energy.length > 0) n += 1;
  if (q.seller !== 'all') n += 1;
  if (q.features.length > 0) n += 1;
  return n;
}

export function addSavedSearch(state: FlowState, entry: SavedSearch): FlowState {
  const without = state.savedSearches.filter((s) => s.id !== entry.id);
  return { ...state, savedSearches: [entry, ...without] };
}

export function removeSavedSearch(state: FlowState, id: string): FlowState {
  return { ...state, savedSearches: state.savedSearches.filter((s) => s.id !== id) };
}

function isRole(value: unknown): value is AppRole {
  return value === 'seeker' || value === 'seller';
}

/** Restore a persisted snapshot. Unknown shapes fall back to a fresh state. */
export function parseFlow(raw: string): FlowState {
  const base = initialFlowState();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return base;
  }
  if (!parsed || typeof parsed !== 'object') return base;
  const row = parsed as Partial<FlowState>;
  const account = row.account;
  const safeAccount: Account =
    account && account.kind === 'member' && (account.source === 'oidc' || account.source === 'device')
      ? {
          kind: 'member',
          source: account.source,
          email: typeof account.email === 'string' ? account.email : null,
          name: typeof account.name === 'string' && account.name.trim() ? account.name : 'Account',
        }
      : { kind: 'guest' };

  return {
    ...base,
    welcomeSeen: row.welcomeSeen === true,
    role: isRole(row.role) ? row.role : null,
    account: safeAccount,
    returnTo: typeof row.returnTo === 'string' ? row.returnTo : null,
    discovery: { ...base.discovery, ...(row.discovery ?? {}) },
    publish: { ...base.publish, ...(row.publish ?? {}) },
    savedSearches: Array.isArray(row.savedSearches) ? row.savedSearches.filter(isSavedSearch) : [],
    notificationsAsked: row.notificationsAsked === true,
    locationAsked: row.locationAsked === true,
    photosAllowed: row.photosAllowed === true,
    enquirySent: row.enquirySent === true,
  };
}

function isSavedSearch(value: unknown): value is SavedSearch {
  if (!value || typeof value !== 'object') return false;
  const row = value as SavedSearch;
  return typeof row.id === 'string' && typeof row.title === 'string' && typeof row.detail === 'string';
}
