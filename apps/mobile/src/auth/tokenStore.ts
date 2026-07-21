import { Platform } from 'react-native';

/**
 * Token storage: SecureStore on native; localStorage on web.
 * Split so Metro web export never resolves the native-only module.
 */
type Store = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

const webStore: Store = {
  async get(key) {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async set(key, value) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async remove(key) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

async function nativeStore(): Promise<Store> {
  const SecureStore = await import('expo-secure-store');
  return {
    get: (key) => SecureStore.getItemAsync(key),
    set: (key, value) => SecureStore.setItemAsync(key, value),
    remove: (key) => SecureStore.deleteItemAsync(key),
  };
}

let resolved: Store | null = Platform.OS === 'web' ? webStore : null;

async function store(): Promise<Store> {
  if (resolved) return resolved;
  resolved = await nativeStore();
  return resolved;
}

export const tokenStore = {
  async get(key: string): Promise<string | null> {
    return (await store()).get(key);
  },
  async set(key: string, value: string): Promise<void> {
    await (await store()).set(key, value);
  },
  async remove(key: string): Promise<void> {
    await (await store()).remove(key);
  },
};
