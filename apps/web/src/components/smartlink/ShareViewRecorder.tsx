'use client';

import { useEffect } from 'react';
import {
  SHARE_VISITOR_COOKIE,
  recordShareView,
} from '@/lib/share-link';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function ShareViewRecorder({ token }: { token: string }) {
  useEffect(() => {
    let visitor = readCookie(SHARE_VISITOR_COOKIE);
    if (!visitor || visitor.length < 8) {
      visitor = randomToken();
      writeCookie(SHARE_VISITOR_COOKIE, visitor);
    }
    void recordShareView(token, visitor);
  }, [token]);

  return null;
}
