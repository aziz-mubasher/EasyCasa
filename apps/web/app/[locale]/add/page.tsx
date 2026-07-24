'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  ASSET_CLASS_SLUGS,
  CONDITION_SLUGS,
  FEATURE_SLUGS,
  FINANCING_OPTION_SLUGS,
  ITALIAN_PROVINCES,
  LEASE_TYPE_SLUGS,
  PROPERTY_TYPE_SLUGS,
  SELLER_TYPE_SLUGS,
  TRANSACTION_TYPE_SLUGS,
  comuniForProvince,
  primaryTransactionType,
  type FeatureSlug,
  type FinancingOptionSlug,
  type SellerTypeSlug,
  type TransactionTypeSlug,
} from '@easycasa/shared';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, TextArea } from '@/components/ui/Field';
import { ValuationBandLive } from '@/components/valuation/ValuationBandLive';
import { SmartLinkManager } from '@/components/smartlink/SmartLinkManager';
import { useAuth } from '@/auth/AuthProvider';
import { apiUrl, createAuthedFetch } from '@/auth/authedFetch';

const TOTAL = 5;
const ENERGY_CLASSES = ['A4', 'A3', 'A2', 'A1', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const MAX_IMAGES = 12;

type FormState = {
  title: string;
  description: string;
  city: string;
  province: string;
  address: string;
  sellerType: SellerTypeSlug;
  transactionTypes: TransactionTypeSlug[];
  assetClass: string;
  propertyType: string;
  condition: string;
  financingOptions: FinancingOptionSlug[];
  leaseType: string;
  features: FeatureSlug[];
  price: string;
  surfaceSqm: string;
  sizeSqm: string;
  bedrooms: string;
  bathrooms: string;
  yearBuilt: string;
  yearRenovated: string;
  energyClass: string;
  videoUrl: string;
};

type LocalImage = { id: string; file: File; previewUrl: string };

const initialForm: FormState = {
  title: '',
  description: '',
  city: '',
  province: '',
  address: '',
  sellerType: 'private',
  transactionTypes: ['sale'],
  assetClass: '',
  propertyType: '',
  condition: '',
  financingOptions: [],
  leaseType: '',
  features: [],
  price: '',
  surfaceSqm: '',
  sizeSqm: '',
  bedrooms: '',
  bathrooms: '',
  yearBuilt: '',
  yearRenovated: '',
  energyClass: '',
  videoUrl: '',
};

const provincesSorted = [...ITALIAN_PROVINCES].sort((a, b) =>
  a.name.localeCompare(b.name, 'it'),
);

async function uploadListingImage(
  authedFetch: typeof fetch,
  listingId: string,
  file: File,
): Promise<void> {
  // Proxy through the API — MinIO is internal-only; browser PUT to presigned
  // http://minio:9000 URLs fails with TypeError "Failed to fetch".
  const form = new FormData();
  form.append('listingId', listingId);
  form.append('file', file);
  const res = await authedFetch(apiUrl('/media/upload'), {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `upload failed: ${res.status}`);
  }
}

export default function AddListingPage() {
  const t = useTranslations('add');
  const tf = useTranslations('search.filters');
  const locale = useLocale();
  const { getAccessToken, isAuthenticated, ready, signIn } = useAuth();
  const authedFetch = useMemo(() => createAuthedFetch(getAccessToken), [getAccessToken]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialForm);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const comuni = useMemo(
    () => (form.province ? comuniForProvince(form.province) : []),
    [form.province],
  );

  const includesRent = form.transactionTypes.includes('rent');
  const primaryTx = primaryTransactionType(form.transactionTypes);

  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(() => {
    return () => {
      for (const img of imagesRef.current) URL.revokeObjectURL(img.previewUrl);
    };
  }, []);

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm((f) => {
        if (key === 'province') return { ...f, province: value, city: '' };
        return { ...f, [key]: value };
      });
      setError(null);
    };

  const toggleTransaction = (slug: TransactionTypeSlug) => {
    setForm((f) => {
      const has = f.transactionTypes.includes(slug);
      const transactionTypes = has
        ? f.transactionTypes.filter((x) => x !== slug)
        : [...f.transactionTypes, slug];
      return {
        ...f,
        transactionTypes,
        leaseType: transactionTypes.includes('rent') ? f.leaseType : '',
      };
    });
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

  const toggleFeature = (slug: FeatureSlug) => {
    setForm((f) => {
      const has = f.features.includes(slug);
      return {
        ...f,
        features: has ? f.features.filter((x) => x !== slug) : [...f.features, slug],
      };
    });
  };

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image/'));
    e.target.value = '';
    if (files.length === 0) return;
    setImages((prev) => {
      const room = Math.max(0, MAX_IMAGES - prev.length);
      const next = files.slice(0, room).map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      return [...prev, ...next];
    });
    setError(null);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const validateStep = (n: number): string | null => {
    if (n === 1) {
      if (form.title.trim().length < 3) return t('errors.title');
      if (!form.province) return t('errors.province');
      if (!form.city.trim()) return t('errors.city');
      if (!form.sellerType) return t('errors.sellerType');
    }
    if (n === 2) {
      if (form.transactionTypes.length === 0) return t('errors.transactionTypes');
      if (!form.assetClass) return t('errors.assetClass');
      if (!form.propertyType) return t('errors.propertyType');
      if (!form.condition) return t('errors.condition');
      if (includesRent && !form.leaseType) return t('errors.leaseType');
    }
    if (n === 3) {
      if (!form.yearBuilt.trim()) return t('errors.yearBuilt');
    }
    if (n === 4 && form.videoUrl.trim()) {
      try {
        void new URL(form.videoUrl.trim());
      } catch {
        return t('errors.videoUrl');
      }
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

  const resetAll = () => {
    for (const img of images) URL.revokeObjectURL(img.previewUrl);
    setImages([]);
    setForm(initialForm);
    setStep(1);
    setCreatedId(null);
    setError(null);
  };

  const submit = async () => {
    const err = validateStep(1) ?? validateStep(2) ?? validateStep(3) ?? validateStep(4);
    if (err) {
      setError(err);
      return;
    }
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
        transactionTypes: form.transactionTypes,
        transactionType: primaryTx ?? undefined,
        assetClass: form.assetClass || undefined,
        propertyType: form.propertyType || undefined,
        condition: form.condition || undefined,
        financingOptions: form.financingOptions,
        leaseType: includesRent && form.leaseType ? form.leaseType : undefined,
        features: form.features,
        price: form.price ? Number(form.price) : undefined,
        surfaceSqm: form.surfaceSqm ? Number(form.surfaceSqm) : undefined,
        sizeSqm: form.sizeSqm ? Number(form.sizeSqm) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
        yearRenovated: form.yearRenovated ? Number(form.yearRenovated) : undefined,
        energyClass: form.energyClass || undefined,
        videoUrl: form.videoUrl.trim() || undefined,
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
      if (!created.id) throw new Error(t('errors.generic'));

      for (const img of images) {
        await uploadListingImage(authedFetch, created.id, img.file);
      }

      const pub = await authedFetch(apiUrl(`/listings/${created.id}/publish`), {
        method: 'POST',
      });
      if (!pub.ok) {
        setCreatedId(created.id);
        setError(t('errors.publishFailed'));
        return;
      }
      setCreatedId(created.id);
    } catch (e) {
      if (e instanceof TypeError && /failed to fetch/i.test(e.message)) {
        setError(t('errors.network'));
      } else {
        setError(e instanceof Error ? e.message : t('errors.generic'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-12">
        <p className="text-muted">{t('loading')}</p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold mb-3">{t('title')}</h1>
        <p className="text-muted mb-6">{t('signInRequiredBody')}</p>
        <Button onClick={() => void signIn(`/${locale}/add`)}>{t('signInToContinue')}</Button>
      </section>
    );
  }

  if (createdId && !error) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="font-display text-3xl font-semibold mb-4">{t('successTitle')}</h1>
        <p className="text-muted mb-6">{t('successBody')}</p>
        <SmartLinkManager listingId={createdId} />
        <div className="mt-8">
          <Button onClick={resetAll}>{t('addAnother')}</Button>
        </div>
      </section>
    );
  }

  const provinceName =
    provincesSorted.find((p) => p.slug === form.province)?.name ?? form.province;

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
              <Field label={t('fields.province')} required hint={t('hints.province')}>
                <Select value={form.province} onChange={set('province')}>
                  <option value="">{t('choose')}</option>
                  {provincesSorted.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name} ({p.slug})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('fields.city')} required hint={t('hints.city')}>
                <Select value={form.city} onChange={set('city')} disabled={!form.province}>
                  <option value="">{t('choose')}</option>
                  {comuni.map((c) => (
                    <option key={c.istat} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
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
            <fieldset>
              <legend className="eyebrow mb-2">
                {tf('transactionLabel')} <span className="text-terracotta">*</span>
              </legend>
              <div className="grid sm:grid-cols-2 gap-2">
                {TRANSACTION_TYPE_SLUGS.map((slug) => {
                  const checked = form.transactionTypes.includes(slug);
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
                        onChange={() => toggleTransaction(slug)}
                      />
                      <span>{tf(`transaction.${slug}`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
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

            {includesRent && (
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
              <Field label={t('fields.surfaceSqm')}>
                <Input type="number" min={0} value={form.surfaceSqm} onChange={set('surfaceSqm')} />
              </Field>
              <Field label={t('fields.builtAreaSqm')}>
                <Input type="number" min={0} value={form.sizeSqm} onChange={set('sizeSqm')} />
              </Field>
              <Field label={t('fields.yearBuilt')} required>
                <Input
                  type="number"
                  min={1800}
                  max={2100}
                  value={form.yearBuilt}
                  onChange={set('yearBuilt')}
                />
              </Field>
              <Field label={t('fields.yearRenovated')}>
                <Input
                  type="number"
                  min={1800}
                  max={2100}
                  value={form.yearRenovated}
                  onChange={set('yearRenovated')}
                />
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

            <fieldset>
              <legend className="eyebrow mb-2">{t('fields.characteristics')}</legend>
              <p className="text-xs text-muted mb-3">{t('hints.characteristics')}</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {FEATURE_SLUGS.map((slug) => {
                  const checked = form.features.includes(slug);
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
                        onChange={() => toggleFeature(slug)}
                      />
                      <span>{tf(`feature.${slug}`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <ValuationBandLive
              comune={form.city}
              provincia={form.province}
              propertyTypeSlug={form.propertyType}
              sizeSqm={form.sizeSqm || form.surfaceSqm}
              priceEur={form.price}
              transactionType={primaryTx || 'sale'}
            />
          </>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-ink">{t('sections.media')}</p>
            <Field label={t('fields.images')} hint={t('hints.images')}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={onPickImages}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-azure file:px-3 file:py-2 file:text-sm file:font-medium file:text-paper hover:file:brightness-110"
              />
            </Field>
            {images.length > 0 && (
              <ul className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <li key={img.id} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-line bg-sand">
                    <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-1 right-1 rounded-full bg-ink/80 text-paper text-xs px-2 py-0.5"
                      aria-label={t('removeImage')}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Field label={t('fields.videoUrl')} hint={t('hints.videoUrl')}>
              <Input
                type="url"
                value={form.videoUrl}
                onChange={set('videoUrl')}
                placeholder="https://"
              />
            </Field>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <p className="text-sm font-medium text-ink">{t('sections.preview')}</p>
            <p className="text-xs text-muted">{t('previewHint')}</p>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img) => (
                  <div key={img.id} className="aspect-[4/3] rounded-lg overflow-hidden border border-line bg-sand">
                    <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-line bg-paper p-4 space-y-3">
              <h2 className="font-display text-xl font-semibold">{form.title}</h2>
              {form.description ? (
                <p className="text-sm text-muted whitespace-pre-wrap">{form.description}</p>
              ) : null}
              <dl className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted">{t('fields.province')}</dt>
                  <dd>{provinceName} ({form.province})</dd>
                </div>
                <div>
                  <dt className="text-muted">{t('fields.city')}</dt>
                  <dd>{form.city}</dd>
                </div>
                {form.address ? (
                  <div className="sm:col-span-2">
                    <dt className="text-muted">{t('fields.address')}</dt>
                    <dd>{form.address}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted">{tf('sellerTypeLabel')}</dt>
                  <dd>{tf(`sellerType.${form.sellerType}`)}</dd>
                </div>
                <div>
                  <dt className="text-muted">{tf('transactionLabel')}</dt>
                  <dd>
                    {form.transactionTypes.length > 0
                      ? form.transactionTypes.map((s) => tf(`transaction.${s}`)).join(', ')
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{tf('assetClassLabel')}</dt>
                  <dd>
                    {form.assetClass ? tf(`assetClass.${form.assetClass as 'residential'}`) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{tf('propertyTypeLabel')}</dt>
                  <dd>
                    {form.propertyType
                      ? tf(`propertyType.${form.propertyType as 'apartment'}`)
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">{tf('conditionLabel')}</dt>
                  <dd>
                    {form.condition ? tf(`condition.${form.condition as 'good'}`) : '—'}
                  </dd>
                </div>
                {includesRent && form.leaseType ? (
                  <div>
                    <dt className="text-muted">{tf('leaseTypeLabel')}</dt>
                    <dd>{tf(`leaseType.${form.leaseType as 'free_4_4'}`)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted">{t('fields.price')}</dt>
                  <dd>{form.price ? `€${Number(form.price).toLocaleString('it-IT')}` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t('fields.surfaceSqm')}</dt>
                  <dd>{form.surfaceSqm ? `${form.surfaceSqm} m²` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t('fields.builtAreaSqm')}</dt>
                  <dd>{form.sizeSqm ? `${form.sizeSqm} m²` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t('fields.yearBuilt')}</dt>
                  <dd>{form.yearBuilt || '—'}</dd>
                </div>
                {form.yearRenovated ? (
                  <div>
                    <dt className="text-muted">{t('fields.yearRenovated')}</dt>
                    <dd>{form.yearRenovated}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted">{t('fields.bedrooms')}</dt>
                  <dd>{form.bedrooms || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">{t('fields.bathrooms')}</dt>
                  <dd>{form.bathrooms || '—'}</dd>
                </div>
                {form.energyClass ? (
                  <div>
                    <dt className="text-muted">{tf('energy')}</dt>
                    <dd>{form.energyClass}</dd>
                  </div>
                ) : null}
              </dl>
              {form.financingOptions.length > 0 && (
                <p className="text-sm">
                  <span className="text-muted">{tf('financingLabel')}: </span>
                  {form.financingOptions.map((s) => tf(`financing.${s}`)).join(', ')}
                </p>
              )}
              {form.features.length > 0 && (
                <p className="text-sm">
                  <span className="text-muted">{t('fields.characteristics')}: </span>
                  {form.features.map((s) => tf(`feature.${s}`)).join(', ')}
                </p>
              )}
              {form.videoUrl.trim() ? (
                <p className="text-sm break-all">
                  <span className="text-muted">{t('fields.videoUrl')}: </span>
                  <a href={form.videoUrl.trim()} className="text-azure underline" target="_blank" rel="noreferrer">
                    {form.videoUrl.trim()}
                  </a>
                </p>
              ) : null}
            </div>
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
          <Button onClick={goNext}>{step === 4 ? t('toPreview') : t('next')}</Button>
        ) : (
          <Button disabled={submitting} onClick={() => void submit()}>
            {submitting ? t('publishing') : t('publish')}
          </Button>
        )}
      </div>
    </section>
  );
}
