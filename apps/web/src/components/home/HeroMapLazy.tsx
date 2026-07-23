'use client';

import dynamic from 'next/dynamic';
import type { ListingSummary } from '@easycasa/shared';
import { HeroMapPlaceholder } from './HeroMapPlaceholder';

const HeroMapPanel = dynamic(
  () => import('./HeroMapPanel').then((m) => ({ default: m.HeroMapPanel })),
  { ssr: false, loading: () => <HeroMapPlaceholder /> },
);

export function HeroMapLazy({ items, ariaLabel }: { items: ListingSummary[]; ariaLabel: string }) {
  return <HeroMapPanel items={items} ariaLabel={ariaLabel} />;
}
