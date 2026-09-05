import type { Metadata } from 'next';
import { DeskCallPage, deskCallMetadata } from '@/components/call-booking/desk-call-page';

type Props = {
  searchParams: Promise<{
    provincia?: string | string[];
    province?: string | string[];
    motivo?: string | string[];
    reason?: string | string[];
  }>;
};

export function generateMetadata(): Metadata {
  return deskCallMetadata('hi');
}

export default async function HiPrenotaChiamataPage({ searchParams }: Props) {
  return <DeskCallPage locale="hi" searchParams={await searchParams} />;
}
