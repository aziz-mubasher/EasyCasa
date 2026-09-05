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
  return deskCallMetadata('ur');
}

export default async function UrPrenotaChiamataPage({ searchParams }: Props) {
  return <DeskCallPage locale="ur" searchParams={await searchParams} />;
}
