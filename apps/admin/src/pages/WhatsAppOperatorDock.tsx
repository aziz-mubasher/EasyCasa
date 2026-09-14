import React from 'react';
import {
  WA_AI_LOCALE_LABEL,
  WA_AI_LOCALES,
  WA_OPERATOR_TEMPLATES,
  isWaOperatorLocale,
  parseWaAiLocale,
  parseWaOperatorLocale,
  resolveCallInviteName,
  waAiTextDirection,
  waOperatorTemplateBody,
  type WaAiLocale,
} from '@easycasa/shared';

type CustomCanned = {
  id: string;
  title: string;
  body: string;
  locale: string;
};

export function WhatsAppOperatorDock({
  replyText,
  replyError,
  canReply,
  sending,
  contactLanguage,
  formName,
  whatsappName,
  customCanned,
  aiEnabled,
  aiBusy,
  aiError,
  onReplyText,
  onSend,
  onCompose,
  onTranslateLatest,
}: {
  replyText: string;
  replyError: string | null;
  canReply: boolean;
  sending: boolean;
  contactLanguage?: string | null;
  formName?: string | null;
  whatsappName?: string | null;
  customCanned: CustomCanned[];
  aiEnabled: boolean;
  aiBusy: boolean;
  aiError: string | null;
  onReplyText: (next: string) => void;
  onSend: (body?: string) => void;
  onCompose: (prompt: string, locale: WaAiLocale) => void;
  onTranslateLatest: () => void;
}) {
  const clientName = resolveCallInviteName({ formName, whatsappName });
  const [locale, setLocale] = React.useState<WaAiLocale>(() => parseWaAiLocale(contactLanguage));
  const [prompt, setPrompt] = React.useState('');

  React.useEffect(() => {
    setLocale(parseWaAiLocale(contactLanguage));
  }, [contactLanguage]);

  const dir = waAiTextDirection(locale);
  const cannedLocale = isWaOperatorLocale(locale) ? locale : null;
  const saved = cannedLocale
    ? customCanned.filter((c) => parseWaOperatorLocale(c.locale) === cannedLocale)
    : [];
  const languageName = WA_AI_LOCALE_LABEL[locale];

  function insert(body: string) {
    onReplyText(body);
  }

  function sendTemplate(body: string) {
    if (!canReply || sending) return;
    onReplyText(body);
    onSend(body);
  }

  function draft() {
    const next = prompt.trim();
    if (!next || !aiEnabled || aiBusy) return;
    onCompose(next, locale);
  }

  return (
    <div className="ecwa__dock">
      <div className="ecwa__dock-langs" role="tablist" aria-label="Reply language">
        {WA_AI_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={locale === code}
            className={`ecwa__chip${locale === code ? ' ecwa__chip--active' : ''}`}
            onClick={() => setLocale(code)}
          >
            {code.toUpperCase()}
            <span className="ecwa__chip-label">{WA_AI_LOCALE_LABEL[code]}</span>
          </button>
        ))}
      </div>
      <div className="ecwa__dock-templates" aria-label="Quick replies">
        {cannedLocale
          ? WA_OPERATOR_TEMPLATES.map((t) => {
          const body =
            t.id === 'call'
              ? waOperatorTemplateBody('call', cannedLocale, { name: clientName })
              : t.body[cannedLocale];
          return (
            <TemplateChip
              key={t.id}
              title={t.title[cannedLocale]}
              body={body}
              canReply={canReply}
              sending={sending}
              onInsert={insert}
              onSend={sendTemplate}
            />
          );
        })
          : null}
        {saved.map((c) => (
          <TemplateChip
            key={c.id}
            title={c.title}
            body={c.body}
            canReply={canReply}
            sending={sending}
            onInsert={insert}
            onSend={sendTemplate}
          />
        ))}
      </div>
      <form
        className="ecwa__ai"
        onSubmit={(e) => {
          e.preventDefault();
          draft();
        }}
      >
        <label className="ec-sr-only" htmlFor="ecwa-ai-prompt">
          Claude prompt
        </label>
        <textarea
          id="ecwa-ai-prompt"
          className="ecwa__composer-input ecwa__ai-input"
          rows={2}
          maxLength={2000}
          placeholder={
            aiEnabled
              ? `Describe the reply in English — Claude writes it in ${languageName}`
              : 'Claude unavailable — set ANTHROPIC_API_KEY on the API'
          }
          value={prompt}
          disabled={!aiEnabled || aiBusy}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              draft();
            }
          }}
        />
        <div className="ecwa__ai-actions">
          <button
            type="submit"
            className="btn btn--sm"
            disabled={!aiEnabled || aiBusy || !prompt.trim()}
          >
            {aiBusy ? 'Drafting…' : `Draft in ${languageName}`}
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={!aiEnabled || aiBusy}
            onClick={onTranslateLatest}
          >
            Latest → EN
          </button>
        </div>
        {aiError ? <p className="error ecwa__composer-error">{aiError}</p> : null}
        <p className="muted ecwa__ai-hint">
          Review the draft, then Send. Claude never sends on its own. No offers, caparra, or price
          advice.
        </p>
      </form>
      <form
        className="ecwa__composer"
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
      >
        <label className="ec-sr-only" htmlFor="ecwa-reply">
          Reply
        </label>
        <textarea
          id="ecwa-reply"
          className="ecwa__composer-input"
          rows={2}
          maxLength={4096}
          dir={dir}
          placeholder={canReply ? 'Type a message' : 'Window closed — reply unavailable'}
          value={replyText}
          disabled={!canReply || sending}
          onChange={(e) => onReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button
          type="submit"
          className="btn ecwa__send"
          disabled={!canReply || sending || !replyText.trim()}
        >
          {sending ? '…' : 'Send'}
        </button>
        {replyError ? <p className="error ecwa__composer-error">{replyError}</p> : null}
      </form>
    </div>
  );
}

function TemplateChip({
  title,
  body,
  canReply,
  sending,
  onInsert,
  onSend,
}: {
  title: string;
  body: string;
  canReply: boolean;
  sending: boolean;
  onInsert: (body: string) => void;
  onSend: (body: string) => void;
}) {
  return (
    <span className="ecwa__tpl">
      <button
        type="button"
        className="ecwa__tpl-insert"
        title={body}
        disabled={!canReply || sending}
        onClick={() => onInsert(body)}
      >
        {title}
      </button>
      <button
        type="button"
        className="ecwa__tpl-send"
        aria-label={`Send ${title}`}
        disabled={!canReply || sending}
        onClick={() => onSend(body)}
      >
        ↵
      </button>
    </span>
  );
}
