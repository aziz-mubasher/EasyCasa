import type { ReactNode } from 'react';
import { DeskLocaleLayout } from '@/components/call-booking/desk-locale-layout';

export default function HiLayout({ children }: { children: ReactNode }) {
  return <DeskLocaleLayout locale="hi">{children}</DeskLocaleLayout>;
}
