import React from 'react';
import {
  WA_OPERATOR_LOCALE_LABEL,
  WA_OPERATOR_LOCALES,
  WA_OPERATOR_TEMPLATES,
  parseWaOperatorLocale,
  waOperatorTextDirection,
  type WaOperatorLocale,
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
  customCanned,
  onReplyText,
  onSend,
}: {
  replyText: string;
  replyError: string | null;
  canReply: boolean;
  sending: boolean;
  contactLanguage?: string | null;
  customCanned: CustomCanned[];
  onReplyText: (next: string) => void;
  onSend: (body?: string) => void;
}) {
  const [locale, setLocale] = React.useState<WaOperatorLocale>(() =>
    parseWaOperatorLocale(contactLanguage),
  );

  React.useEffect(() => {
    setLocale(parseWaOperatorLocale(contactLanguage));
  }, [contactLanguage]);

  const dir = waOperatorTextDirection(locale);
  const saved = customCanned.filter((c) => parseWaOperatorLocale(c.locale) === locale);

  function insert(body: string) {
    onReplyText(body);
  }

  function sendTemplate(body: string) {
    if (!canReply || sending) return;
    onReplyText(body);
    onSend(body);
  }

  return (
    <div className="ecwa__dock">
      <div className="ecwa__dock-langs" role="tablist" aria-label="Reply language">
        {WA_OPERATOR_LOCALES.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={locale === code}
            className={`ecwa__chip${locale === code ? ' ecwa__chip--active' : ''}`}
            onClick={() => setLocale(code)}
          >
            {code.toUpperCase()}
            <span className="ecwa__chip-label">{WA_OPERATOR_LOCALE_LABEL[code]}</span>
          </button>
        ))}
      </div>
      <div className="ecwa__dock-templates" aria-label="Quick replies">
        {WA_OPERATOR_TEMPLATES.map((t) => (
          <TemplateChip
            key={t.id}
            title={t.title[locale]}
            body={t.body[locale]}
            canReply={canReply}
            sending={sending}
            onInsert={insert}
            onSend={sendTemplate}
          />
        ))}
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
