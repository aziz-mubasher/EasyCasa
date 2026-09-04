'use client';

import { useId, useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
  CALL_BOOKING_REASONS,
  ITALIAN_PROVINCES,
  callReasonLabel,
  parseCallBookingQuery,
  type CallBookingLocale,
  type CallBookingReason,
} from '@easycasa/shared';
import { Link } from '@/i18n/routing';
import { submitCallRequest } from '@/lib/call-booking-api';
import './book-call.css';

type Props = {
  locale: CallBookingLocale;
  initialProvince?: string | null;
  initialReason?: string | null;
};

export function BookCallForm({ locale, initialProvince, initialReason }: Props) {
  const t = useTranslations('bookCall');
  const id = useId();
  const parsed = useMemo(
    () => parseCallBookingQuery({ provincia: initialProvince ?? null, motivo: initialReason ?? null }),
    [initialProvince, initialReason],
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState(parsed.province ?? '');
  const [reason, setReason] = useState<CallBookingReason | ''>(parsed.reason ?? '');
  const [preferredAt, setPreferredAt] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const locked = Boolean(parsed.province && parsed.reason);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!consent || !province || !reason) {
      setErrorMsg(t('errors.required'));
      return;
    }
    setBusy(true);
    try {
      await submitCallRequest({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        province,
        reason,
        preferredAt: preferredAt ? new Date(preferredAt).toISOString() : null,
        locale,
        consent: true,
      });
      setDone(true);
    } catch {
      setErrorMsg(t('errors.submit'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="book-call" data-testid="book-call-success">
        <div className="book-call-wrap">
          <h1>{t('success.title')}</h1>
          <p>{t('success.body')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="book-call">
      <div className="book-call-wrap">
        <p className="book-call-eyebrow">{t('eyebrow')}</p>
        <h1>{t('title')}</h1>
        <p className="book-call-lead">{t('lead')}</p>
        {parsed.provinceName && parsed.reason ? (
          <p className="book-call-chip" data-testid="book-call-context">
            <strong>{parsed.provinceName}</strong>
            <span aria-hidden> · </span>
            {callReasonLabel(parsed.reason, locale)}
          </p>
        ) : null}
        <p className="book-call-note">{t('notAdvice')}</p>

        <form className="book-call-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="book-call-field">
            <label htmlFor={`${id}-name`}>{t('fields.name')}</label>
            <input
              id={`${id}-name`}
              name="fullName"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="book-call-field">
            <label htmlFor={`${id}-email`}>{t('fields.email')}</label>
            <input
              id={`${id}-email`}
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="book-call-field">
            <label htmlFor={`${id}-phone`}>{t('fields.phone')}</label>
            <input
              id={`${id}-phone`}
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="book-call-field">
            <label htmlFor={`${id}-province`}>{t('fields.province')}</label>
            <select
              id={`${id}-province`}
              name="province"
              required
              value={province}
              disabled={locked && Boolean(parsed.province)}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">{t('fields.provinceNone')}</option>
              {ITALIAN_PROVINCES.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="book-call-field">
            <label htmlFor={`${id}-reason`}>{t('fields.reason')}</label>
            <select
              id={`${id}-reason`}
              name="reason"
              required
              value={reason}
              disabled={locked && Boolean(parsed.reason)}
              onChange={(e) => setReason(e.target.value as CallBookingReason)}
            >
              <option value="">{t('fields.reasonNone')}</option>
              {CALL_BOOKING_REASONS.map((r) => (
                <option key={r} value={r}>
                  {callReasonLabel(r, locale)}
                </option>
              ))}
            </select>
          </div>
          <div className="book-call-field">
            <label htmlFor={`${id}-when`}>{t('fields.when')}</label>
            <input
              id={`${id}-when`}
              name="preferredAt"
              type="datetime-local"
              value={preferredAt}
              onChange={(e) => setPreferredAt(e.target.value)}
            />
            <p className="book-call-hint">{t('fields.whenHint')}</p>
          </div>
          <div className="book-call-consent">
            <input
              id={`${id}-consent`}
              name="consent"
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <label htmlFor={`${id}-consent`}>
              {t('consent.before')}
              <Link href="/legal/privacy">{t('consent.privacy')}</Link>
              {t('consent.after')}
            </label>
          </div>
          {errorMsg ? (
            <p className="book-call-error" role="alert">
              {errorMsg}
            </p>
          ) : null}
          <button type="submit" className="book-call-submit" disabled={busy}>
            {busy ? t('submitting') : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
