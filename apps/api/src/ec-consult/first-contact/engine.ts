import { message1Text, message2ForLocale } from '../copy/load-message-copy';
import { MENU_MISS_CALLBACK_IT_EN } from '../fences';
import { classifyTextInbound } from './classify-inbound';
import { parseMenuChoice } from './menu-parse';

export type ContactState = {
  language: string | null;
  firstContactStep: 'none' | 'menu_sent' | 'welcome_sent' | 'menu_retry_sent';
  menuMissCount: number;
  lastRoute: string | null;
  windowStartedAt: string | null;
  aiPausedUntil: string | null;
  optOut: boolean;
};

export type PlannedOutbound = { text: string; markAi: boolean; kind: string };

export function planFirstContactReply(
  inboundText: string,
  state: ContactState,
  opts: { messageType?: string; detectLanguage?: (t: string) => string | null },
): PlannedOutbound[] {
  const kind = classifyTextInbound(inboundText, {
    hasWelcome: state.firstContactStep === 'welcome_sent',
    messageType: opts.messageType,
  });

  if (
    state.firstContactStep === 'none' ||
    state.firstContactStep === 'menu_sent' ||
    state.firstContactStep === 'menu_retry_sent'
  ) {
    const menuChoice = parseMenuChoice(inboundText);
    if (menuChoice && state.firstContactStep !== 'none') {
      const m2 = message2ForLocale(menuChoice);
      if (m2) return [{ text: m2, markAi: true, kind: 'message2' }];
    }
    if (state.firstContactStep === 'none' && kind === 'greeting') {
      return [{ text: message1Text(), markAi: true, kind: 'message1' }];
    }
    if (state.firstContactStep === 'none' && kind === 'info_without_ask') {
      const lang = opts.detectLanguage?.(inboundText) ?? 'it';
      const m2 = message2ForLocale(lang) ?? message2ForLocale('it');
      if (!m2) return [];
      return [{ text: m2, markAi: true, kind: 'message2' }];
    }
    if (state.firstContactStep === 'none' && kind === 'clear_question') {
      return [{ text: '__MODEL__', markAi: true, kind: 'direct_answer' }];
    }
    const choice = parseMenuChoice(inboundText);
    if (choice) {
      const m2 = message2ForLocale(choice);
      if (!m2) return [];
      return [{ text: m2, markAi: true, kind: 'message2' }];
    }
    if (state.firstContactStep === 'menu_sent' || state.firstContactStep === 'menu_retry_sent') {
      if (state.menuMissCount >= 2) return [];
      if (state.menuMissCount === 0) {
        return [{ text: message1Text(), markAi: true, kind: 'message1_retry' }];
      }
      return [{ text: MENU_MISS_CALLBACK_IT_EN, markAi: true, kind: 'callback_offer' }];
    }
  }

  if (state.firstContactStep === 'welcome_sent' && kind === 'route_after_welcome') {
    const t = inboundText.trim();
    if (/^3$/.test(t) || /team|team/i.test(t)) {
      return [{ text: '__CALLBACK_INTAKE__', markAi: true, kind: 'callback_route' }];
    }
    if (/^1$/.test(t) || /easy\s*casa/i.test(t)) {
      return [
        {
          text: 'Vuole comprare, vendere o affittare una casa? Risponda con una parola.',
          markAi: true,
          kind: 'easy_casa_route',
        },
      ];
    }
    if (/^2$/.test(t) || /easy\s*legenda/i.test(t)) {
      return [
        {
          text:
            'Easy Legenda legge i documenti del fascicolo d’asta che carica sul sito. Il primo fascicolo è gratuito. Se è la prima volta, il corso Asta è su scuolavideo.com.',
          markAi: true,
          kind: 'easy_legenda_route',
        },
      ];
    }
  }

  return [{ text: '__MODEL__', markAi: true, kind: 'free_text' }];
}

export function nextStateAfterInbound(
  state: ContactState,
  inboundText: string,
  planned: PlannedOutbound[],
): ContactState {
  const next = { ...state };
  const kind = planned[0]?.kind;
  if (kind === 'message1') {
    next.firstContactStep = 'menu_sent';
    next.menuMissCount = 0;
  } else if (kind === 'message1_retry') {
    next.firstContactStep = 'menu_retry_sent';
    next.menuMissCount = 1;
  } else if (kind === 'callback_offer') {
    next.menuMissCount = 2;
    next.firstContactStep = 'menu_retry_sent';
  } else if (kind === 'message2') {
    next.firstContactStep = 'welcome_sent';
    const loc = parseMenuChoice(inboundText);
    if (loc) next.language = loc;
  } else if (kind === 'direct_answer') {
    const loc = parseMenuChoice(inboundText) ?? 'it';
    next.language = loc;
    next.firstContactStep = 'welcome_sent';
  }
  if (!next.windowStartedAt) next.windowStartedAt = new Date().toISOString();
  return next;
}