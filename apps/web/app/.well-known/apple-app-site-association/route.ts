import { NextResponse } from 'next/server';

/**
 * Apple Universal Links association.
 * Replace TEAMID with the Apple Developer Team ID before App Store release.
 * Served as application/json with no redirect (required by Apple).
 */
export function GET() {
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: 'TEAMID.it.easycasa.app',
          paths: ['/listing/*', '/it/listings/*', '/en/listings/*', '/es/listings/*'],
        },
      ],
    },
  };
  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
