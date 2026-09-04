import React, { useMemo, useState } from 'react';
import {
  CALL_BOOKING_REASONS,
  ITALIAN_PROVINCES,
  buildCallBookingUrl,
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
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => {
    try {
      return buildCallBookingUrl({ origin: publicOrigin(), locale, province, reason });
    } catch {
      return '';
    }
  }, [locale, province, reason]);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

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
        >
          <option value="it">IT</option>
          <option value="en">EN</option>
          <option value="es">ES</option>
        </select>
      </div>

      <label className="muted" htmlFor="crm-call-url">
        Link
      </label>
      <div className="crm-call-links__row">
        <input id="crm-call-url" className="input mono" readOnly value={url} />
        <button type="button" className="btn btn--primary" onClick={() => void copy()} disabled={!url}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        {url ? (
          <a className="btn btn--sm" href={url} target="_blank" rel="noreferrer">
            Open
          </a>
        ) : null}
      </div>
    </div>
  );
}
