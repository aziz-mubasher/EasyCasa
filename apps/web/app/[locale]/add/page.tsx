'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ASSET_CLASS_SLUGS,
  CONDITION_SLUGS,
  FINANCING_OPTION_SLUGS,
  LEASE_TYPE_SLUGS,
  PROPERTY_TYPE_SLUGS,
  SELLER_TYPE_SLUGS,
  TRANSACTION_TYPE_SLUGS,
  type FinancingOptionSlug,
  type SellerTypeSlug,
  type TransactionTypeSlug,
} from '@easycasa/shared';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, TextArea } from '@/components/ui/Field';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';

const TOTAL = 4;
const ENERGY_CLASSES = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

type FormState = {
  title: string;
  description: string;
  city: string;
  province: string;
  address: string;
  sellerType: SellerTypeSlug;
  transactionType: TransactionTypeSlug | '';
  assetClass: string;
  propertyType: string;
  condition: string;
  financingOptions: FinancingOptionSlug[];
  leaseType: string;
  price: string;
  sizeSqm: string;
  bedrooms: string;
  bathrooms: string;
  energyClass: string;
};

const initialForm: FormState = {
  title: '',
  description: '',
  city: '',
  province: '',
  address: '',
  sellerType: 'private',
  transactionType: 'sale',
  assetClass: '',
  propertyType: '',
  condition: '',
  financingOptions: [],
  leaseType: '',
  price: '',
  sizeSqm: '',
  bedrooms: '',
  bathrooms: '',
  energyClass: '',
};

export default function AddListingPage() {
  const t = useTranslations('add');
  const tf = useTranslations('search.filters');
  const { getAccessToken, isAuthenticated, ready, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setError(null);
    };

  const toggleFinancing = (slug: FinancingOptionSlug) => {
    setForm((f) => {
      const has = f.financingOptions.includes(slug);
      return {
        ...f,
        financingOptions: has
          ? f.financingOptions.filter((x) => x !== slug)
          : [...f.financingOptions, slug],
      };
    });
  };

  const validateStep = (n: number): string | null => {
    if (n === 1) {
      if (form.title.trim().length < 3) return t('errors.title');
      if (!form.city.trim()) return t('errors.city');
      if (!form.sellerType) return t('errors.sellerType');
    }
    if (n === 2) {
      if (!form.transactionType) return t('errors.transactionType');
      if (!form.assetClass) return t('errors.assetClass');
      if (!form.propertyType) return t('errors.propertyType');
      if (!form.condition) return t('errors.condition');
      if (form.transactionType === 'rent' && !form.leaseType) return t('errors.leaseType');
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL, s + 1));
  };

  const submit = async () => {
    const err = validateStep(1) ?? validateStep(2);
    if (err) {
      setError(err);
      return;
    }
    if (!ready) return;
    if (!isAuthenticated) {
      setError(t('errors.signInRequired'));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        city: form.city.trim() || undefined,
        province: form.province.trim() || undefined,
        address: form.address.trim() || undefined,
        sellerType: form.sellerType,
        transactionType: form.transactionType || undefined,
        assetClass: form.assetClass || undefined,
        propertyType: form.propertyType || undefined,
        condition: form.condition || undefined,
        financingOptions: form.financingOptions,
        leaseType:
          form.transactionType === 'rent' && form.leaseType ? form.leaseType : undefined,
        price: form.price ? Number(form.price) : undefined,
        sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        energyClass: form.energyClass || undefined,
      };

      const res = await authedFetch(apiUrl('/listings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const created = (await res.json()) as { id?: string };
      if (created.id) {
        const pub = await authedFetch(apiUrl(`/listings/${created.id}/publish`), {
          method: 'POST',
        });
        if (!pub.ok) {
          // Draft saved even if publish fails (role / validation).
          setCreatedId(created.id);
          setError(t('errors.publishFailed'));
          return;
        }
        setCreatedId(created.id);
      } else {
        setCreatedId('ok');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  if (createdId && !error) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold mb-4">{t('successTitle')}</h1>
        <p className="text-muted mb-6">{t('successBody')}</p>
        <Button onClick={() => { setCreatedId(null); setForm(initialForm); setStep(1); }}>
          {t('addAnother')}
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <p className="eyebrow mb-2">{t('step', { n: step, total: TOTAL })}</p>
      <h1 className="font-display text-3xl font-semibold mb-2">{t('title')}</h1>
      <p className="text-sm text-muted mb-6">{t('subtitle')}</p>

      <div className="rounded-xl2 border border-line p-6 space-y-5">
        {step === 1 && (
          <>
            <p className="text-sm font-medium text-ink">{t('sections.basics')}</p>
            <Field label={t('fields.title')} required>
              <Input value={form.title} onChange={set('title')} maxLength={120} />
            </Field>
            <Field label={t('fields.description')}>
              <TextArea value={form.description} onChange={set('description')} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label={t('fields.city')} required>
                <Input value={form.city} onChange={set('city')} />
              </Field>
              <Field label={t('fields.province')} hint={t('hints.province')}>
                <Input value={form.province} onChange={set('province')} placeholder="BS" />
              </Field>
            </div>
            <Field label={t('fields.address')}>
              <Input value={form.address} onChange={set('address')} />
            </Field>
            <Field label={tf('sellerTypeLabel')} required hint={t('hints.sellerType')}>
              <Select value={form.sellerType} onChange={set('sellerType')}>
                {SELLER_TYPE_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {tf(`sellerType.${slug}`)}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm font-medium text-ink">{t('sections.taxonomy')}</p>
            <Field label={tf('transactionLabel')} required>
              <Select value={form.transactionType} onChange={set('transactionType')}>
                <option value="">{t('choose')}</option>
                {TRANSACTION_TYPE_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {tf(`transaction.${slug}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tf('assetClassLabel')} required>
              <Select value={form.assetClass} onChange={set('assetClass')}>
                <option value="">{t('choose')}</option>
                {ASSET_CLASS_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {tf(`assetClass.${slug}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tf('propertyTypeLabel')} required>
              <Select value={form.propertyType} onChange={set('propertyType')}>
                <option value="">{t('choose')}</option>
                {PROPERTY_TYPE_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {tf(`propertyType.${slug}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tf('conditionLabel')} required>
              <Select value={form.condition} onChange={set('condition')}>
                <option value="">{t('choose')}</option>
                {CONDITION_SLUGS.map((slug) => (
                  <option key={slug} value={slug}>
                    {tf(`condition.${slug}`)}
                  </option>
                ))}
              </Select>
            </Field>

            <fieldset>
              <legend className="eyebrow mb-2">{tf('financingLabel')}</legend>
              <p className="text-xs text-muted mb-3">{t('hints.financing')}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {FINANCING_OPTION_SLUGS.map((slug) => {
                  const checked = form.financingOptions.includes(slug);
                  return (
                    <label
                      key={slug}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${
                        checked ? 'border-azure bg-azure/5 text-azure' : 'border-line hover:border-ink'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="accent-[var(--azure)]"
                        checked={checked}
                        onChange={() => toggleFinancing(slug)}
                      />
                      <span>{tf(`financing.${slug}`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {form.transactionType === 'rent' && (
              <Field label={tf('leaseTypeLabel')} required hint={t('hints.leaseType')}>
                <Select value={form.leaseType} onChange={set('leaseType')}>
                  <option value="">{t('choose')}</option>
                  {LEASE_TYPE_SLUGS.map((slug) => (
                    <option key={slug} value={slug}>
                      {tf(`leaseType.${slug}`)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <p className="text-sm font-medium text-ink">{t('sections.specs')}</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t('fields.price')}>
                <Input type="number" min={0} value={form.price} onChange={set('price')} />
              </Field>
              <Field label={t('fields.sizeSqm')}>
                <Input type="number" min={0} value={form.sizeSqm} onChange={set('sizeSqm')} />
              </Field>
              <Field label={t('fields.bedrooms')}>
                <Input type="number" min={0} value={form.bedrooms} onChange={set('bedrooms')} />
              </Field>
              <Field label={t('fields.bathrooms')}>
                <Input type="number" min={0} value={form.bathrooms} onChange={set('bathrooms')} />
              </Field>
            </div>
            <Field label={tf('energy')}>
              <Select value={form.energyClass} onChange={set('energyClass')}>
                <option value="">{t('choose')}</option>
                {ENERGY_CLASSES.map((ec) => (
                  <option key={ec} value={ec}>
                    {ec}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink">{t('sections.media')}</p>
            <div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">
              {t('mediaPlaceholder')}
            </div>
            <div className="rounded-lg bg-sand/40 border border-line p-4 text-sm space-y-1">
              <p className="font-medium">{t('reviewTitle')}</p>
              <p>{form.title}</p>
              <p className="text-muted">
                {[
                  form.sellerType ? tf(`sellerType.${form.sellerType}`) : null,
                  form.transactionType ? tf(`transaction.${form.transactionType as TransactionTypeSlug}`) : null,
                  form.assetClass ? tf(`assetClass.${form.assetClass as 'residential'}`) : null,
                  form.propertyType ? tf(`propertyType.${form.propertyType as 'apartment'}`) : null,
                  form.condition ? tf(`condition.${form.condition as 'good'}`) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              {form.financingOptions.length > 0 && (
                <p className="text-muted">
                  {tf('financingLabel')}:{' '}
                  {form.financingOptions.map((s) => tf(`financing.${s}`)).join(', ')}
                </p>
              )}
            </div>
            {!isAuthenticated && ready && (
              <p className="text-sm text-muted">
                {t('signInHint')}{' '}
                <button type="button" className="text-azure underline" onClick={() => void signIn()}>
                  {t('signIn')}
                </button>
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-between gap-3">
        <Button variant="ghost" disabled={step === 1 || submitting} onClick={() => setStep((s) => s - 1)}>
          {t('back')}
        </Button>
        {step < TOTAL ? (
          <Button onClick={goNext}>{t('next')}</Button>
        ) : (
          <Button disabled={submitting} onClick={() => void submit()}>
            {submitting ? t('publishing') : t('publish')}
          </Button>
        )}
      </div>
    </section>
  );
}
