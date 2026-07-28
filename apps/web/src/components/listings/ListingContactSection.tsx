'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ContactEnquiryForm } from '@/components/listings/ContactEnquiryForm';
import { Banks4AllFinancingReferral } from '@/components/financing/Banks4AllFinancingReferral';
import { Link } from '@/i18n/routing';
import { telHref, whatsAppHref } from '@/lib/agent-public';

type Props = {
  listingId: string;
  listingSlug: string;
  listingTitle: string;
  agentName: string | null;
  agentPhone: string | null;
  showFinancingReferral?: boolean;
};

/** Bottom-of-page contact: book viewing + message, with clear hierarchy and readable copy. */
export function ListingContactSection({
  listingId,
  listingSlug,
  listingTitle,
  agentName,
  agentPhone,
  showFinancingReferral = false,
}: Props) {
  const t = useTranslations('listingDetail.contact');
  const [open, setOpen] = useState(false);
  const tel = telHref(agentPhone);
  const wa = whatsAppHref(agentPhone);

  return (
    <section
      id="contact"
      className="scroll-mt-28 max-w-3xl border-t border-line pt-10 space-y-7"
      aria-labelledby="listing-contact-heading"
    >
      <header className="space-y-2 max-w-2xl">
        <p className="eyebrow">{t('label')}</p>
        <h2
          id="listing-contact-heading"
          className="font-display text-2xl sm:text-[1.75rem] font-semibold text-ink leading-tight"
        >
          {t('heading')}
        </h2>
        <p className="text-base leading-relaxed text-ink-soft">{t('intro')}</p>
        {agentName ? (
          <p className="text-sm leading-relaxed text-ink pt-1">
            <span className="text-muted">{t('publisher')}: </span>
            <span className="font-medium">{agentName}</span>
          </p>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        <article className="flex flex-col rounded-xl2 border border-line bg-paper p-5 sm:p-6 shadow-sm">
          <p className="eyebrow">{t('bookEyebrow')}</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-ink leading-snug">
            {t('bookTitle')}
          </h3>
          <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-ink-soft">{t('bookHint')}</p>
          <Link
            href={`/listings/${listingSlug}/book`}
            className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-azure px-5 py-3 text-sm font-medium font-[var(--font-display)] text-paper transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
          >
            {t('bookViewing')}
          </Link>
        </article>

        <article className="flex flex-col rounded-xl2 border border-line bg-paper p-5 sm:p-6 shadow-sm">
          <p className="eyebrow">{t('writeEyebrow')}</p>
          <h3 className="mt-2 font-display text-lg font-semibold text-ink leading-snug">
            {t('writeTitle')}
          </h3>
          <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-ink-soft">{t('writeHint')}</p>
          {!open ? (
            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full py-3 border-ink/25 hover:border-ink"
              onClick={() => setOpen(true)}
            >
              {t('cta')}
            </Button>
          ) : (
            <p className="mt-5 text-sm text-azure font-[var(--font-display)]" aria-live="polite">
              {t('formOpenHint')}
            </p>
          )}
        </article>
      </div>

      {(tel || wa) && (
        <div className="space-y-2">
          <p className="eyebrow">{t('directLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {tel && agentPhone ? (
              <a
                href={tel}
                className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
              >
                {t('call', { phone: agentPhone })}
              </a>
            ) : null}
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
              >
                {t('whatsapp')}
              </a>
            ) : null}
          </div>
        </div>
      )}

      {open ? (
        <div className="rounded-xl2 border border-line bg-paper p-5 sm:p-7 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
            <div className="space-y-1 min-w-0">
              <p className="eyebrow">{t('writeEyebrow')}</p>
              <h3 className="font-display text-xl font-semibold text-ink">{t('formTitle')}</h3>
              <p className="text-sm leading-relaxed text-ink-soft">{t('formIntro')}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-sm text-muted hover:text-ink underline-offset-2 hover:underline"
              onClick={() => setOpen(false)}
            >
              {t('close')}
            </button>
          </div>
          <ContactEnquiryForm
            listingId={listingId}
            listingTitle={listingTitle}
            className="!mt-0 max-w-none"
          />
        </div>
      ) : null}

      {showFinancingReferral ? (
        <div className="border-t border-line pt-6">
          <Banks4AllFinancingReferral variant="inline" />
        </div>
      ) : null}
    </section>
  );
}
