import type { ReactNode } from 'react';
import { DeskLocaleLayout } from '@/components/call-booking/desk-locale-layout';

export default function UrLayout({ children }: { children: ReactNode }) {
  return <DeskLocaleLayout locale="ur">{children}</DeskLocaleLayout>;
}
