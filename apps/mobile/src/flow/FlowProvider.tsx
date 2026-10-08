import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '../auth/AuthProvider';
import { tokenStore } from '../auth/tokenStore';
import {
  addSavedSearch,
  chooseRole,
  initialFlowState,
  parseFlow,
  removeSavedSearch,
  signInAccount,
  signOutAccount,
  withReturnTo,
  type AppRole,
  type DiscoveryQuery,
  type FlowState,
  type PublishDraft,
  type SavedSearch,
} from './machine';

const STORAGE_KEY = 'ec.flow.v1';

type SignInOutcome = 'ok' | 'cancel' | 'device';

type FlowApi = {
  ready: boolean;
  state: FlowState;
  isMember: boolean;
  role: AppRole | null;
  chooseRole: (role: AppRole) => void;
  continueSignIn: () => Promise<SignInOutcome>;
  signOut: () => Promise<void>;
  setReturnTo: (path: string | null) => void;
  consumeReturnTo: () => string | null;
  setDiscovery: (patch: Partial<DiscoveryQuery>) => void;
  setPublish: (patch: Partial<PublishDraft>) => void;
  saveCurrentSearch: () => void;
  removeSavedSearch: (id: string) => void;
  askNotifications: () => void;
  askLocation: () => void;
  askPhotos: (allow: boolean) => void;
  markEnquirySent: () => void;
};

const FlowContext = createContext<FlowApi | null>(null);

export function FlowProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [state, setState] = useState<FlowState>(initialFlowState);
  const [ready, setReady] = useState(false);
  const returnRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void tokenStore.get(STORAGE_KEY).then((raw) => {
      if (cancelled) return;
      if (raw) setState(parseFlow(raw));
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    returnRef.current = state.returnTo;
  }, [state.returnTo]);

  useEffect(() => {
    if (!ready) return;
    void tokenStore.set(STORAGE_KEY, JSON.stringify(state));
  }, [ready, state]);

  const continueSignIn = useCallback(async (): Promise<SignInOutcome> => {
    let result = await auth.signIn();
    if (result === 'unavailable') {
      await new Promise((resolve) => setTimeout(resolve, 800));
      result = await auth.signIn();
    }
    if (result === 'ok') {
      setState((current) => signInAccount(current, 'oidc'));
      return 'ok';
    }
    // Keycloak did not hand back a session (closed window, or a redirect this
    // origin is not allowed to use). The in-app account still opens so Esci
    // and the gated screens stay attached. A later successful OIDC login
    // replaces this device session.
    setState((current) => signInAccount(current, 'device'));
    return 'device';
  }, [auth]);

  const signOut = useCallback(async () => {
    setState((current) => signOutAccount(current));
    if (auth.isAuthenticated) await auth.signOut();
  }, [auth]);

  const value = useMemo<FlowApi>(
    () => ({
      ready,
      state,
      isMember: state.account.kind === 'member' || auth.isAuthenticated,
      role: state.role,
      chooseRole: (role) => setState((current) => chooseRole(current, role)),
      continueSignIn,
      signOut,
      setReturnTo: (path) => setState((current) => withReturnTo(current, path)),
      consumeReturnTo: () => {
        const path = returnRef.current;
        setState((current) => withReturnTo(current, null));
        return path;
      },
      setDiscovery: (patch) =>
        setState((current) => ({ ...current, discovery: { ...current.discovery, ...patch } })),
      setPublish: (patch) =>
        setState((current) => ({ ...current, publish: { ...current.publish, ...patch } })),
      saveCurrentSearch: () =>
        setState((current) => {
          const q = current.discovery;
          const bits = [
            q.dealType === 'rent' ? 'Affitto' : 'Vendita',
            q.priceMaxEur != null ? `fino a € ${q.priceMaxEur.toLocaleString('it-IT')}` : null,
            q.minRooms != null ? `${q.minRooms}+ locali` : null,
            q.seller === 'private' ? 'solo privati' : null,
          ].filter((part): part is string => part != null);
          const entry: SavedSearch = {
            id: `${q.text}-${q.dealType}-${q.priceMaxEur ?? 'any'}-${q.minRooms ?? 'any'}`,
            title: q.text || 'Ricerca',
            detail: bits.join(' · '),
            fresh: 0,
          };
          return addSavedSearch(current, entry);
        }),
      removeSavedSearch: (id) => setState((current) => removeSavedSearch(current, id)),
      askNotifications: () => setState((current) => ({ ...current, notificationsAsked: true })),
      askLocation: () => setState((current) => ({ ...current, locationAsked: true })),
      askPhotos: (allow) =>
        setState((current) => ({
          ...current,
          photosAllowed: allow,
          publish: allow
            ? { ...current.publish, photos: Math.max(current.publish.photos, 3) }
            : current.publish,
        })),
      markEnquirySent: () => setState((current) => ({ ...current, enquirySent: true })),
    }),
    [auth.isAuthenticated, continueSignIn, ready, signOut, state],
  );

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow(): FlowApi {
  const ctx = useContext(FlowContext);
  if (!ctx) throw new Error('useFlow must be used within FlowProvider');
  return ctx;
}
