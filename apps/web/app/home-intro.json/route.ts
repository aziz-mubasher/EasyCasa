import { NextResponse } from 'next/server';
import { loadHomeIntroCatalog } from '@/lib/home-intro-video';

export const dynamic = 'force-dynamic';

/** Public catalog for the homepage intro player (no Stream API key in the response). */
export async function GET() {
  const catalog = await loadHomeIntroCatalog();
  return NextResponse.json(catalog, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
