'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

const TOTAL = 3;

export default function AddListingPage() {
  const t = useTranslations('add');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Record<string, string>>({});
  const upd = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <p className="eyebrow mb-2">{t('step', { n: step, total: TOTAL })}</p>
      <h1 className="font-display text-3xl font-semibold mb-6">{t('title')}</h1>

      <div className="rounded-xl2 border border-line p-6 space-y-4">
        {step === 1 && (
          <>
            <Field label="Titolo"><Input value={form.title ?? ''} onChange={upd('title')} /></Field>
            <Field label="Città"><Input value={form.city ?? ''} onChange={upd('city')} /></Field>
          </>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prezzo (€)"><Input type="number" value={form.price ?? ''} onChange={upd('price')} /></Field>
            <Field label="Superficie (m²)"><Input type="number" value={form.sizeSqm ?? ''} onChange={upd('sizeSqm')} /></Field>
            <Field label="Camere"><Input type="number" value={form.bedrooms ?? ''} onChange={upd('bedrooms')} /></Field>
            <Field label="Bagni"><Input type="number" value={form.bathrooms ?? ''} onChange={upd('bathrooms')} /></Field>
          </div>
        )}
        {step === 3 && (
          <div className="text-sm text-muted">
            {/* Media upload uses POST /media/presign -> PUT to MinIO -> POST /media/confirm */}
            <div className="rounded-lg border border-dashed border-line p-10 text-center data">
              Trascina le foto qui — upload diretto (presigned)
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>{t('back')}</Button>
        {step < TOTAL
          ? <Button onClick={() => setStep((s) => s + 1)}>{t('next')}</Button>
          : <Button>{t('publish')}</Button>}
      </div>
    </section>
  );
}
