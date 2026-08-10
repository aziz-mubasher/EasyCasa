'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/auth/AuthProvider';
import {
  askChat,
  getChatHistory,
  type ChatMessage,
} from '@/lib/aste-analysis-api';
import { PRODUCT_EVENTS, trackProduct } from '@/lib/product-analytics';
import './aste-report-chat.css';

const TOPICS = [
  'occupazione',
  'difformita',
  'spese',
  'vincoli',
  'partecipare',
] as const;

export function AsteReportChat({ analysisId }: { analysisId: string }) {
  const t = useTranslations('asteReport.chat');
  const locale = useLocale() as 'it' | 'en' | 'es';
  const id = useId();
  const liveRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { getAccessToken } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filenames, setFilenames] = useState<Record<string, string>>({});
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveAnnounce, setLiveAnnounce] = useState('');

  const chatEnabled = locale === 'it' || locale === 'en';
  const askLang: 'it' | 'en' = locale === 'en' ? 'en' : 'it';

  useEffect(() => {
    if (!chatEnabled) return;
    void (async () => {
      try {
        const hist = await getChatHistory(getAccessToken, analysisId);
        setMessages(hist.messages);
        setFilenames(hist.filenameById);
      } catch {
        /* history optional on first paint */
      }
    })();
  }, [analysisId, chatEnabled, getAccessToken]);

  async function submit(text: string) {
    const q = text.trim();
    if (!q || !chatEnabled || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await askChat(getAccessToken, analysisId, { question: q, lang: askLang });
      setFilenames((prev) => ({ ...prev, ...res.filenameById }));
      setMessages((prev) => [...prev, res.userMessage, res.assistantMessage]);
      setQuestion('');
      const category = res.assistantMessage.refused
        ? 'refused'
        : !(res.assistantMessage.citations?.length)
          ? 'not_found'
          : 'answered';
      trackProduct(PRODUCT_EVENTS.ASTE_CHAT_QUESTION_ASKED, {
        lang: askLang,
        category,
      });
      setLiveAnnounce(t('liveAnswer'));
      inputRef.current?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('errors.ask');
      setError(msg.includes('rate') || msg.includes('limit') || msg.includes('Daily') ? msg : t('errors.ask'));
      if (msg.includes('Daily') || msg.includes('limit')) {
        trackProduct(PRODUCT_EVENTS.ASTE_CHAT_RATE_LIMITED, { lang: askLang });
      }
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit(question);
  }

  return (
    <section className="arc no-print" aria-labelledby={`${id}-chat-title`}>
      <h2 id={`${id}-chat-title`}>{t('title')}</h2>
      <p className="arc-lead">{t('lead')}</p>

      {!chatEnabled ? (
        <p className="arc-notice" role="status">
          {t('esDisabled')}
        </p>
      ) : (
        <>
          <div className="arc-topics" role="group" aria-label={t('topicsLabel')}>
            {TOPICS.map((key) => (
              <button
                key={key}
                type="button"
                className="arc-topic"
                disabled={busy}
                onClick={() => void submit(t(`topics.${key}`))}
              >
                {t(`topics.${key}`)}
              </button>
            ))}
          </div>

          <div className="arc-history" aria-live="polite" aria-relevant="additions">
            {!messages.length ? <p className="arc-empty">{t('empty')}</p> : null}
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              const refused = Boolean(m.refused);
              const notFound = isAssistant && !refused && !(m.citations?.length);
              return (
                <article
                  key={m.id}
                  className={`arc-msg arc-msg--${m.role}${refused ? ' arc-msg--refused' : ''}${
                    notFound ? ' arc-msg--notfound' : ''
                  }`}
                >
                  <p className="arc-role">
                    {m.role === 'user' ? t('you') : t('assistant')}
                    {refused ? (
                      <span className="arc-badge" aria-label={t('stateRefused')}>
                        {' '}
                        ✕ {t('stateRefused')}
                      </span>
                    ) : null}
                    {notFound ? (
                      <span className="arc-badge" aria-label={t('stateNotFound')}>
                        {' '}
                        ? {t('stateNotFound')}
                      </span>
                    ) : null}
                  </p>
                  <p className="arc-content">{m.content}</p>
                  {m.citations?.length ? (
                    <ul className="arc-cites">
                      {m.citations.map((c) => (
                        <li key={`${c.document_id}-${c.page}`}>
                          <span className="arc-cite">
                            {filenames[c.document_id] ?? c.document_id}, p. {c.page}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              );
            })}
          </div>

          <div ref={liveRef} className="visually-hidden" aria-live="assertive">
            {liveAnnounce}
          </div>

          <p className="arc-disclaimer" role="note">
            <strong>{t('counselMark')}</strong> — {t('disclaimer')}
          </p>

          {error ? (
            <p className="arc-error" role="alert">
              {error}
            </p>
          ) : null}

          <form className="arc-form" onSubmit={onSubmit}>
            <label htmlFor={`${id}-q`}>{t('inputLabel')}</label>
            <textarea
              id={`${id}-q`}
              ref={inputRef}
              rows={3}
              maxLength={1000}
              value={question}
              disabled={busy}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('placeholder')}
            />
            <button className="arc-btn" type="submit" disabled={busy || !question.trim()}>
              {busy ? t('sending') : t('send')}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
