import { NextResponse } from 'next/server';
import { loadSellPrivatelyIntroCatalog } from '@/lib/home-intro-video';

export const dynamic = 'force-dynamic';

/** Public catalog for the sell-privately hero player (no Stream API key in the response). */
export async function GET() {
  const catalog = await loadSellPrivatelyIntroCatalog();
  return NextResponse.json(catalog, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
