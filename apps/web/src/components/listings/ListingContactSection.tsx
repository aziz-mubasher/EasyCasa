'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { ContactEnquiryForm } from '@/components/listings/ContactEnquiryForm';
import { telHref, whatsAppHref } from '@/lib/agent-public';

type Props = {
  listingId: string;
  listingTitle: string;
  agentName: string | null;
  agentPhone: string | null;
};

/** Bottom-of-page Contatta: phone / WhatsApp + enquiry form with consent gate. */
export function ListingContactSection({
  listingId,
  listingTitle,
  agentName,
  agentPhone,
}: Props) {
  const t = useTranslations('listingDetail.contact');
  const [open, setOpen] = useState(false);
  const tel = telHref(agentPhone);
  const wa = whatsAppHref(agentPhone);

  return (
    <section
      id="contact"
      className="scroll-mt-28 max-w-3xl border-t border-line pt-10 space-y-5"
      aria-labelledby="listing-contact-heading"
    >
      <div>
        <h2 id="listing-contact-heading" className="font-display text-2xl font-semibold text-ink">
          {t('heading')}
        </h2>
        <p className="mt-1 text-sm text-muted">{t('intro')}</p>
        {agentName ? (
          <p className="mt-2 text-sm text-ink">
            <span className="text-muted">{t('publisher')}: </span>
            {agentName}
          </p>
        ) : null}
      </div>

      {(tel || wa) && (
        <div className="flex flex-wrap gap-2">
          {tel && agentPhone ? (
            <a
              href={tel}
              className="inline-flex items-center rounded-lg border border-line bg-paper px-4 py-2.5 text-sm font-medium text-ink hover:border-ink"
            >
              {t('call', { phone: agentPhone })}
            </a>
          ) : null}
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:brightness-110"
            >
              {t('whatsapp')}
            </a>
          ) : null}
        </div>
      )}

      {!open ? (
        <Button type="button" onClick={() => setOpen(true)}>
          {t('cta')}
        </Button>
      ) : (
        <div className="rounded-xl2 border border-line bg-paper p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">{t('formTitle')}</h3>
            <button
              type="button"
              className="text-sm text-muted hover:text-ink"
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
      )}
    </section>
  );
}
