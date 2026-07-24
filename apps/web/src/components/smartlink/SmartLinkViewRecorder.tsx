'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { fetchSmartLinkPublic, SMARTLINK_VISITOR_COOKIE } from '@/lib/smartlink';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 400;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Ensures visitor cookie exists and refreshes stats once for unique-view dedup. */
export function SmartLinkViewRecorder({ token, hadVisitorCookie }: { token: string; hadVisitorCookie: boolean }) {
  const router = useRouter();

  useEffect(() => {
    let vid = readCookie(SMARTLINK_VISITOR_COOKIE);
    if (!vid) {
      vid = crypto.randomUUID();
      writeCookie(SMARTLINK_VISITOR_COOKIE, vid);
    }
    if (hadVisitorCookie) return;
    void fetchSmartLinkPublic(token, vid).then(() => {
      router.refresh();
    });
  }, [token, hadVisitorCookie, router]);

  return null;
}
