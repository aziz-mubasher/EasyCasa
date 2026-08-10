'use client';

import { useEffect, useId, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/auth/AuthProvider';
import {
  getReport,
  patchAnalysis,
  type AsteBuyerProfile,
  type AsteReport,
} from '@/lib/aste-analysis-api';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';
import './aste-report.css';

const SEMAFORO_DIMS = [
  'vincoli_gravami',
  'occupazione',
  'conformita_urbanistica',
  'conformita_catastale',
  'condizione_immobile',
  'spese_condominiali',
  'rischio_asta',
  'buyer_readiness',
] as const;

const ECON_KEYS = [
  'valore_stima',
  'prezzo_base',
  'offerta_minima',
  'cauzione_pct',
  'rilancio_minimo',
  'superficie_commerciale_mq',
] as const;

function levelIcon(level: string): string {
  switch (level) {
    case 'ok':
      return '✓';
    case 'verify':
      return '!';
    case 'critical':
      return '✕';
    default:
      return '?';
  }
}

function formatMoney(n: number | null | undefined, locale: string): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : locale === 'es' ? 'es-ES' : 'it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function Translated({
  it,
  path,
  translations,
  showBoth,
}: {
  it: string | null | undefined;
  path?: string;
  translations: Record<string, string>;
  showBoth: boolean;
}) {
  if (!it) return null;
  const en = path ? translations[path] : undefined;
  if (!showBoth || !en) return <span>{it}</span>;
  return (
    <span className="ar-bilingual">
      <span lang="it">{it}</span>
      <span className="ar-bilingual__tr" lang="en">
        {en}
      </span>
    </span>
  );
}

function GlossaryTip({
  termKey,
  glossary,
  counselLabel,
}: {
  termKey: string;
  glossary: AsteReport['glossary'];
  counselLabel: string;
}) {
  const g = glossary.find((x) => x.termKey === termKey);
  if (!g) return <span className="ar-term">{termKey.replace(/_/g, ' ')}</span>;
  return (
    <abbr
      className="ar-term"
      title={g.counselReviewed ? g.definition : `${g.definition} (${counselLabel})`}
    >
      {termKey.replace(/_/g, ' ')}
    </abbr>
  );
}

export function AsteReportPage({ analysisId }: { analysisId: string }) {
  const t = useTranslations('asteReport');
  const locale = useLocale() as 'it' | 'en' | 'es';
  const id = useId();
  const { ready, isAuthenticated, getAccessToken, signIn } = useAuth();

  const [report, setReport] = useState<AsteReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<AsteBuyerProfile>({
    residency: null,
    purpose: null,
    has_cf: null,
    has_pec_firma: null,
    financing_needed: null,
  });

  const contentLang = locale === 'en' ? 'en' : 'it';
  const showBoth = contentLang === 'en';

  async function load(printed = false) {
    setBusy(true);
    setError(null);
    try {
      const row = await getReport(getAccessToken, analysisId, locale, { printed });
      setReport(row);
      setShowProfile(row.buyerProfileSkipped);
      if (row.buyerProfile) setProfile(row.buyerProfile);
      trackProduct(PRODUCT_EVENTS.ASTE_REPORT_VIEWED, {
        language: locale,
        register: row.register,
      });
    } catch {
      setError(t('errors.load'));
      setReport(null);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      void signIn(`/${locale}/aste/analisi/${analysisId}/report`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on auth ready
  }, [ready, isAuthenticated, analysisId, locale]);

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await patchAnalysis(getAccessToken, analysisId, profile);
      trackProduct(PRODUCT_EVENTS.ASTE_BUYER_PROFILE_COMPLETED, {
        residency: profile.residency ?? 'unknown',
      });
      setShowProfile(false);
      await load();
    } catch {
      setError(t('errors.profile'));
    } finally {
      setBusy(false);
    }
  }

  async function onSkipProfile() {
    setBusy(true);
    try {
      await patchAnalysis(getAccessToken, analysisId, { skip_buyer_profile: true });
      setShowProfile(false);
      await load();
    } catch {
      setError(t('errors.profile'));
    } finally {
      setBusy(false);
    }
  }

  async function onRegister(register: 'investor' | 'first_buyer') {
    setBusy(true);
    try {
      await patchAnalysis(getAccessToken, analysisId, { register });
      await load();
    } catch {
      setError(t('errors.profile'));
    } finally {
      setBusy(false);
    }
  }

  function onPrint() {
    trackProduct(PRODUCT_EVENTS.ASTE_REPORT_PRINTED, { language: locale });
    void getReport(getAccessToken, analysisId, locale, { printed: true }).catch(() => undefined);
    window.print();
  }

  if (!ready || busy && !report) {
    return (
      <div className="ar">
        <div className="ar-wrap">
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="ar">
        <div className="ar-wrap">
          <p className="ar-error" role="alert">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const ex = report.extraction;
  const filename = (fileId: string) => report.filenameById[fileId] ?? fileId;
  const counts = SEMAFORO_DIMS.reduce(
    (acc, d) => {
      const lv = report.semaforo[d] ?? 'unknown';
      acc[lv] = (acc[lv] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const omi = report.omiCheck;
  const purpose = report.buyerProfile?.purpose ?? 'investimento';

  return (
    <div className="ar">
      <header className="ar-hero no-print-hide">
        <div className="ar-wrap">
          <p className="ar-brand">EasyCasa</p>
          <p className="ar-badge">{t('badge')}</p>
          <h1>{t('title')}</h1>
          <p className="ar-lead">{t('lead')}</p>
        </div>
      </header>

      <div className="ar-wrap ar-body">
        <p className="ar-disclaimer" role="note">
          <strong>{t('counselMark')}</strong> — {t('disclaimer')}
        </p>

        {report.esContentFallback ? (
          <p className="ar-notice" role="status">
            {t('esNotice')}
          </p>
        ) : null}

        {error ? (
          <p className="ar-error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="ar-toolbar no-print">
          <div className="ar-field-inline">
            <label htmlFor={`${id}-reg`}>{t('register.label')}</label>
            <select
              id={`${id}-reg`}
              value={report.register}
              onChange={(e) => void onRegister(e.target.value as 'investor' | 'first_buyer')}
              disabled={busy}
            >
              <option value="first_buyer">{t('register.first_buyer')}</option>
              <option value="investor">{t('register.investor')}</option>
            </select>
          </div>
          <button type="button" className="ar-btn" onClick={onPrint}>
            {t('print')}
          </button>
        </div>

        {showProfile ? (
          <form className="ar-section no-print" onSubmit={onSaveProfile}>
            <h2>{t('buyerForm.title')}</h2>
            <p>{t('buyerForm.sub')}</p>
            <div className="ar-grid">
              <div className="ar-field">
                <label htmlFor={`${id}-res`}>{t('buyerForm.residency')}</label>
                <select
                  id={`${id}-res`}
                  value={profile.residency ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      residency: (e.target.value || null) as AsteBuyerProfile['residency'],
                    })
                  }
                >
                  <option value="">{t('buyerForm.unknown')}</option>
                  <option value="it_resident">{t('buyerForm.it_resident')}</option>
                  <option value="eu_nonresident">{t('buyerForm.eu_nonresident')}</option>
                  <option value="non_eu">{t('buyerForm.non_eu')}</option>
                </select>
              </div>
              <div className="ar-field">
                <label htmlFor={`${id}-pur`}>{t('buyerForm.purpose')}</label>
                <select
                  id={`${id}-pur`}
                  value={profile.purpose ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      purpose: (e.target.value || null) as AsteBuyerProfile['purpose'],
                    })
                  }
                >
                  <option value="">{t('buyerForm.unknown')}</option>
                  <option value="prima_casa">{t('buyerForm.prima_casa')}</option>
                  <option value="investimento">{t('buyerForm.investimento')}</option>
                </select>
              </div>
              <div className="ar-field">
                <label htmlFor={`${id}-cf`}>{t('buyerForm.has_cf')}</label>
                <select
                  id={`${id}-cf`}
                  value={profile.has_cf === null ? '' : profile.has_cf ? 'yes' : 'no'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      has_cf: e.target.value === '' ? null : e.target.value === 'yes',
                    })
                  }
                >
                  <option value="">{t('buyerForm.unknown')}</option>
                  <option value="yes">{t('buyerForm.yes')}</option>
                  <option value="no">{t('buyerForm.no')}</option>
                </select>
              </div>
              <div className="ar-field">
                <label htmlFor={`${id}-pec`}>{t('buyerForm.has_pec')}</label>
                <select
                  id={`${id}-pec`}
                  value={profile.has_pec_firma === null ? '' : profile.has_pec_firma ? 'yes' : 'no'}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      has_pec_firma: e.target.value === '' ? null : e.target.value === 'yes',
                    })
                  }
                >
                  <option value="">{t('buyerForm.unknown')}</option>
                  <option value="yes">{t('buyerForm.yes')}</option>
                  <option value="no">{t('buyerForm.no')}</option>
                </select>
              </div>
              <div className="ar-field">
                <label htmlFor={`${id}-fin`}>{t('buyerForm.financing')}</label>
                <select
                  id={`${id}-fin`}
                  value={
                    profile.financing_needed === null ? '' : profile.financing_needed ? 'yes' : 'no'
                  }
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      financing_needed: e.target.value === '' ? null : e.target.value === 'yes',
                    })
                  }
                >
                  <option value="">{t('buyerForm.unknown')}</option>
                  <option value="yes">{t('buyerForm.yes')}</option>
                  <option value="no">{t('buyerForm.no')}</option>
                </select>
              </div>
            </div>
            <div className="ar-actions">
              <button className="ar-btn" type="submit" disabled={busy}>
                {t('buyerForm.save')}
              </button>
              <button className="ar-btn ar-btn--ghost" type="button" onClick={() => void onSkipProfile()}>
                {t('buyerForm.skip')}
              </button>
            </div>
          </form>
        ) : null}

        <section className="ar-section" aria-labelledby={`${id}-proc`}>
          <h2 id={`${id}-proc`}>{t('sections.procedure')}</h2>
          <dl className="ar-dl">
            <div>
              <dt>{t('fields.tribunale')}</dt>
              <dd>{(ex.procedura.tribunale as string) || report.tribunale || '—'}</dd>
            </div>
            <div>
              <dt>
                <GlossaryTip termKey="rge" glossary={report.glossary} counselLabel={t('counselMark')} />
              </dt>
              <dd>{(ex.procedura.rge as string) || report.rge || '—'}</dd>
            </div>
            <div>
              <dt>{t('fields.lotto')}</dt>
              <dd>{(ex.procedura.lotto as string) || report.lotto || '—'}</dd>
            </div>
            <div>
              <dt>{t('fields.data_asta')}</dt>
              <dd>{(ex.procedura.data_asta as string) || report.dataAsta || '—'}</dd>
            </div>
            <div>
              <dt>{t('fields.termine_offerte')}</dt>
              <dd>
                {(ex.procedura.termine_offerte as string) || report.termineOfferte || '—'}
                {report.termineOfferte ? (
                  <span className="ar-countdown">
                    {' '}
                    (
                    {Math.max(
                      0,
                      Math.ceil(
                        (new Date(report.termineOfferte).getTime() - Date.now()) /
                          (24 * 60 * 60 * 1000),
                      ),
                    )}{' '}
                    {t('fields.days_left')})
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>{t('fields.address')}</dt>
              <dd>
                {(ex.immobile.indirizzo as string) || report.addressRaw || '—'}
                {ex.immobile.comune ? `, ${String(ex.immobile.comune)}` : ''}
                {ex.immobile.provincia ? ` (${String(ex.immobile.provincia)})` : ''}
              </dd>
            </div>
          </dl>
          <h3>{t('sections.documents')}</h3>
          <ul className="ar-docs">
            {report.documents.map((d) => (
              <li key={d.id}>
                <span className="ar-mono">{d.docType}</span> — {d.originalFilename}
              </li>
            ))}
          </ul>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-sem`}>
          <h2 id={`${id}-sem`}>{t('sections.semaforo')}</h2>
          <p className="ar-aggregate">
            {t('semaforo.aggregate', {
              ok: counts.ok ?? 0,
              verify: counts.verify ?? 0,
              critical: counts.critical ?? 0,
              unknown: counts.unknown ?? 0,
            })}
          </p>
          <ul className="ar-semaforo">
            {SEMAFORO_DIMS.map((dim) => {
              const level = report.semaforo[dim] ?? 'unknown';
              return (
                <li key={dim} className={`ar-sem-item ar-sem-item--${level}`}>
                  <span className="ar-sem-icon" aria-hidden="true">
                    {levelIcon(level)}
                  </span>
                  <span className="ar-sem-label">{t(`semaforo.dims.${dim}`)}</span>
                  <span className="ar-sem-level">{t(`semaforo.levels.${level}`)}</span>
                </li>
              );
            })}
          </ul>
          {!report.buyerProfileSkipped && report.buyerReadiness.checklist.length > 0 ? (
            <div className="ar-checklist">
              <h3>{t('buyerChecklist.title')}</h3>
              <ul>
                {report.buyerReadiness.checklist.map((item) => (
                  <li key={item.key}>
                    <span className={`ar-chip ar-chip--${item.level}`}>{levelIcon(item.level)}</span>{' '}
                    {t(`buyerChecklist.items.${item.key}`)}
                    <span className="ar-counsel"> ({t('counselMark')})</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="ar-section" aria-labelledby={`${id}-econ`}>
          <h2 id={`${id}-econ`}>{t('sections.economics')}</h2>
          <ul className="ar-figures">
            {ECON_KEYS.map((key) => {
              const fig = ex.economics[key];
              if (!fig) {
                return (
                  <li key={key}>
                    <strong>
                      {report.register === 'first_buyer' ? (
                        <GlossaryTip
                          termKey={
                            key === 'prezzo_base'
                              ? 'prezzo_base'
                              : key === 'offerta_minima'
                                ? 'offerta_minima'
                                : key === 'cauzione_pct'
                                  ? 'cauzione'
                                  : key === 'rilancio_minimo'
                                    ? 'rilancio_minimo'
                                    : key
                          }
                          glossary={report.glossary}
                          counselLabel={t('counselMark')}
                        />
                      ) : (
                        t(`econ.${key}`)
                      )}
                    </strong>
                    <span>{t('notFound')}</span>
                  </li>
                );
              }
              const label =
                key === 'cauzione_pct'
                  ? `${fig.value}%`
                  : key === 'superficie_commerciale_mq'
                    ? `${fig.value} mq`
                    : formatMoney(fig.value, locale);
              return (
                <li key={key}>
                  <strong>{t(`econ.${key}`)}</strong>
                  <span>{label}</span>
                  <span className="ar-cite">
                    {filename(fig.source.file)}, p. {fig.source.page}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-jur`}>
          <h2 id={`${id}-jur`}>{t('sections.giuridica')}</h2>
          <p>
            <strong>{t('fields.diritto')}</strong>:{' '}
            <Translated
              it={ex.giuridica.diritto_venduto as string}
              path="giuridica.diritto_venduto"
              translations={report.translations}
              showBoth={showBoth}
            />
          </p>
          <p>
            <strong>
              <GlossaryTip
                termKey="stato_occupazione"
                glossary={report.glossary}
                counselLabel={t('counselMark')}
              />
            </strong>
            : {(ex.giuridica.stato_occupazione as { stato?: string })?.stato || '—'} —{' '}
            <Translated
              it={(ex.giuridica.stato_occupazione as { dettaglio?: string })?.dettaglio}
              path="giuridica.stato_occupazione.dettaglio"
              translations={report.translations}
              showBoth={showBoth}
            />
          </p>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-urb`}>
          <h2 id={`${id}-urb`}>{t('sections.urbanistica')}</h2>
          <p>
            <strong>{t('fields.urb')}</strong>:{' '}
            {(ex.urbanistica.conformita_urbanistica as { stato?: string })?.stato || '—'} —{' '}
            <Translated
              it={(ex.urbanistica.conformita_urbanistica as { dettaglio?: string })?.dettaglio}
              path="urbanistica.conformita_urbanistica.dettaglio"
              translations={report.translations}
              showBoth={showBoth}
            />
          </p>
          <p>
            <strong>{t('fields.cat')}</strong>:{' '}
            {(ex.urbanistica.conformita_catastale as { stato?: string })?.stato || '—'}
          </p>
          <p>
            <strong>{t('fields.catasto')}</strong>: {String(ex.immobile.categoria_catastale || '—')} /{' '}
            {String(ex.immobile.foglio || '—')}-{String(ex.immobile.particella || '—')}/
            {String(ex.immobile.subalterno || '—')}
          </p>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-cond`}>
          <h2 id={`${id}-cond`}>{t('sections.condizioni')}</h2>
          <p>
            <Translated
              it={ex.condizioni.stato_manutentivo as string}
              path="condizioni.stato_manutentivo"
              translations={report.translations}
              showBoth={showBoth}
            />
          </p>
          <p>
            <Translated
              it={ex.condizioni.impianti as string}
              path="condizioni.impianti"
              translations={report.translations}
              showBoth={showBoth}
            />
          </p>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-spese`}>
          <h2 id={`${id}-spese`}>{t('sections.spese')}</h2>
          <p>
            <GlossaryTip
              termKey="spese_condominiali_arretrate"
              glossary={report.glossary}
              counselLabel={t('counselMark')}
            />
            :{' '}
            {ex.spese.condominiali_arretrate
              ? formatMoney(
                  (ex.spese.condominiali_arretrate as { value: number }).value,
                  locale,
                )
              : t('notFound')}
          </p>
          <ul>
            {(ex.spese.oneri_acquirente as Array<{ descrizione: string }>).map((o, i) => (
              <li key={i}>
                <Translated
                  it={o.descrizione}
                  path={`spese.oneri_acquirente.${i}.descrizione`}
                  translations={report.translations}
                  showBoth={showBoth}
                />
              </li>
            ))}
          </ul>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-omi`}>
          <h2 id={`${id}-omi`}>{t('sections.omi')}</h2>
          {!omi?.available ? (
            <p>{t('omi.unavailable')}</p>
          ) : (
            <>
              <div className="ar-omi-visual" aria-hidden="true">
                <div className="ar-omi-bar">
                  <span className="ar-omi-min">
                    {formatMoney(omi.omi_range?.min, locale)}
                  </span>
                  <span className="ar-omi-mid">
                    {formatMoney(omi.omi_range?.mid, locale)}
                  </span>
                  <span className="ar-omi-max">
                    {formatMoney(omi.omi_range?.max, locale)}
                  </span>
                </div>
                <svg viewBox="0 0 200 12" className="ar-omi-svg" role="img">
                  <rect x="0" y="4" width="200" height="4" fill="currentColor" opacity="0.2" />
                  <rect x="20" y="2" width="160" height="8" rx="2" fill="currentColor" opacity="0.45" />
                  <circle cx="100" cy="6" r="5" fill="currentColor" />
                </svg>
              </div>
              <dl className="ar-dl">
                <div>
                  <dt>{t('omi.unit')}</dt>
                  <dd>{t(`omi.units.${omi.omi_range_unit ?? 'eur_per_mq'}`)}</dd>
                </div>
                <div>
                  <dt>{t('omi.sconto')}</dt>
                  <dd>{omi.sconto_reale_pct != null ? `${omi.sconto_reale_pct}%` : '—'}</dd>
                </div>
                <div>
                  <dt>{t('omi.method')}</dt>
                  <dd>
                    {omi.method ?? '—'} / {omi.confidence ?? '—'}
                  </dd>
                </div>
                <div>
                  <dt>{t('omi.period')}</dt>
                  <dd>{omi.period ?? '—'}</dd>
                </div>
              </dl>
            </>
          )}
          {omi?.warnings?.length ? (
            <ul className="ar-warn">
              {omi.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <p className="ar-attr">{omi?.attribution ?? t('omi.attribution')}</p>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-scen`}>
          <h2 id={`${id}-scen`}>{t('sections.scenari')}</h2>
          <p>{t(`scenari.${purpose === 'prima_casa' ? 'prima_casa' : 'investimento'}`)}</p>
        </section>

        <section className="ar-section" aria-labelledby={`${id}-crit`}>
          <h2 id={`${id}-crit`}>{t('sections.criticita')}</h2>
          {!report.criticita.length ? (
            <p>{t('criticita.empty')}</p>
          ) : (
            <ul className="ar-cards">
              {report.criticita.map((c) => (
                <li key={c.dimension} className={`ar-card ar-card--${c.level}`}>
                  <p className="ar-card-level">
                    <span aria-hidden="true">{levelIcon(c.level)}</span>{' '}
                    {t(`semaforo.levels.${c.level}`)} — {t(`semaforo.dims.${c.dimension}`)}
                  </p>
                  <p className="ar-card-prob">
                    {c.problema_it.length
                      ? c.problema_it.map((p, i) => (
                          <span key={i}>
                            <Translated
                              it={p}
                              translations={report.translations}
                              showBoth={showBoth}
                            />{' '}
                          </span>
                        ))
                      : t('criticita.noSnippet')}
                  </p>
                  <p className="ar-card-action">{t(`criticita.actions.${c.action_key}`)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ar-section" aria-labelledby={`${id}-nf`}>
          <h2 id={`${id}-nf`}>{t('sections.notFound')}</h2>
          <ul>
            {ex.meta.not_found.length === 0 ? (
              <li>{t('notFoundEmpty')}</li>
            ) : (
              ex.meta.not_found.map((n) => (
                <li key={n}>
                  <Translated
                    it={n}
                    path={`meta.not_found.${ex.meta.not_found.indexOf(n)}`}
                    translations={report.translations}
                    showBoth={showBoth}
                  />{' '}
                  — {t('notFoundGuidance')}
                </li>
              ))
            )}
          </ul>
        </section>

        <p className="ar-disclaimer" role="note">
          <strong>{t('counselMark')}</strong> — {t('disclaimer')}
        </p>
      </div>
    </div>
  );
}
