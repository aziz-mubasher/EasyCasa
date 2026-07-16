import { NextResponse } from 'next/server';

/**
 * Android App Links digital asset links.
 * Replace `sha256_cert_fingerprints` with the Play App Signing cert fingerprint
 * before production release.
 */
export function GET() {
  const body = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'it.easycasa.app',
        sha256_cert_fingerprints: ['REPLACE_WITH_PLAY_APP_SIGNING_SHA256'],
      },
    },
  ];
  return NextResponse.json(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
