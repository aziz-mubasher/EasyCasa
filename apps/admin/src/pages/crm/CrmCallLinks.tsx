import React, { useMemo, useState } from 'react';
import {
  CALL_BOOKING_LOCALES,
  CALL_BOOKING_LOCALE_LABEL,
  CALL_BOOKING_REASONS,
  ITALIAN_PROVINCES,
  buildCallBookingInvite,
  buildCallBookingUrl,
  callBookingTextDirection,
  callReasonLabel,
  type CallBookingLocale,
  type CallBookingReason,
} from '@easycasa/shared';

function publicOrigin(): string {
  const api = import.meta.env.VITE_API_BASE_URL ?? 'https://easycasaita.com/api';
  return api.replace(/\/api\/?$/, '') || 'https://easycasaita.com';
}

export function CrmCallLinks() {
  const [province, setProvince] = useState('BS');
  const [reason, setReason] = useState<CallBookingReason>('sell');
  const [locale, setLocale] = useState<CallBookingLocale>('it');
  const [guestName, setGuestName] = useState('');
  const [copied, setCopied] = useState<'link' | 'invite' | null>(null);

  const url = useMemo(() => {
    try {
      return buildCallBookingUrl({ origin: publicOrigin(), locale, province, reason });
    } catch {
      return '';
    }
  }, [locale, province, reason]);

  const invite = useMemo(
    () => (url ? buildCallBookingInvite({ locale, name: guestName, url }) : ''),
    [guestName, locale, url],
  );

  async function copy(kind: 'link' | 'invite') {
    const text = kind === 'link' ? url : invite;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 2000);
  }

  const dir = callBookingTextDirection(locale);

  return (
    <div className="crm-call-links">
      <h2>Shareable call links</h2>
      <p className="muted">
        Anyone who opens the link sees the <strong>province</strong> and <strong>reason</strong>. When they
        submit, CRM creates a contact (`call_request`) and an open <strong>Call</strong> task.
      </p>
      <p className="muted">
        Portal callback only — not an offer desk, not a mutuo intake. T04 rows 10–12 stay out.
      </p>

      <div className="crm-filters">
        <select className="input" value={province} onChange={(e) => setProvince(e.target.value)}>
          {ITALIAN_PROVINCES.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} ({p.slug})
            </option>
          ))}
        </select>
        <select
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value as CallBookingReason)}
        >
          {CALL_BOOKING_REASONS.map((r) => (
            <option key={r} value={r}>
              {callReasonLabel(r, 'en')}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={locale}
          onChange={(e) => setLocale(e.target.value as CallBookingLocale)}
          aria-label="Invitation language"
        >
          {CALL_BOOKING_LOCALES.map((code) => (
            <option key={code} value={code}>
              {CALL_BOOKING_LOCALE_LABEL[code]}
            </option>
          ))}
        </select>
      </div>

      <label className="muted" htmlFor="crm-call-guest">
        Guest name (for the invitation)
      </label>
      <input
        id="crm-call-guest"
        className="input"
        value={guestName}
        placeholder="name"
        autoComplete="name"
        onChange={(e) => setGuestName(e.target.value)}
      />

      <label className="muted" htmlFor="crm-call-url">
        Link
      </label>
      <div className="crm-call-links__row">
        <input id="crm-call-url" className="input mono" readOnly value={url} />
        <button type="button" className="btn btn--primary" onClick={() => void copy('link')} disabled={!url}>
          {copied === 'link' ? 'Copied' : 'Copy link'}
        </button>
        {url ? (
          <a className="btn btn--sm" href={url} target="_blank" rel="noreferrer">
            Open
          </a>
        ) : null}
      </div>

      <label className="muted" htmlFor="crm-call-invite">
        Invitation (EC Consult)
      </label>
      <textarea
        id="crm-call-invite"
        className="input crm-call-links__invite"
        readOnly
        rows={6}
        dir={dir}
        lang={locale}
        value={invite}
      />
      <div className="crm-call-links__row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void copy('invite')}
          disabled={!invite}
        >
          {copied === 'invite' ? 'Copied' : 'Copy invitation'}
        </button>
      </div>
    </div>
  );
}
