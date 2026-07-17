import { FascicoloWizard } from '@/components/owner/FascicoloWizard';

export default async function OwnerFascicoloPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="eyebrow mb-2">proprietario</p>
      <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
        Fascicolo immobiliare
      </h1>
      <p className="mt-2 max-w-2xl text-[var(--muted)]">
        Checklist documentale italiana: APE per pubblicare, conformità per il rogito.
      </p>
      <div className="mt-8">
        <FascicoloWizard propertyId={id} />
      </div>
    </div>
  );
}
