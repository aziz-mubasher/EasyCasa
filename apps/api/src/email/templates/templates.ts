/**
 * Transactional email templates for the seeker pilot — Phase 36 / 36.1.
 * Pure functions: (params, locale) -> { subject, text, html }.
 */
import { formatBandMaxCentsEuro } from '../../enquiries/banks4all/format-band';

export type Locale = 'it' | 'en' | 'es';

export interface Rendered {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const wrap = (bodyHtml: string): string =>
  `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto">${bodyHtml}` +
  `<hr style="border:none;border-top:1px solid #E7DFCF;margin:24px 0">` +
  `<p style="color:#6b6b6b;font-size:12px">EasyCasa · easycasaita.com</p></div>`;

export interface EnquirySeekerParams {
  seekerName: string;
  listingTitle: string;
  listingUrl: string;
}
export function enquiryReceivedSeeker(p: EnquirySeekerParams, locale: Locale = 'it'): Rendered {
  if (locale === 'en') {
    return {
      subject: `We've received your enquiry — ${p.listingTitle}`,
      text: `Hi ${p.seekerName},\n\nThanks for your interest in "${p.listingTitle}". The agent has been notified and will get back to you shortly.\n\nView the listing: ${p.listingUrl}\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.seekerName)},</p><p>Thanks for your interest in <strong>${esc(p.listingTitle)}</strong>. The agent has been notified and will get back to you shortly.</p><p><a href="${esc(p.listingUrl)}">View the listing</a></p>`,
      ),
    };
  }
  return {
    subject: `Abbiamo ricevuto la tua richiesta — ${p.listingTitle}`,
    text: `Ciao ${p.seekerName},\n\nGrazie per il tuo interesse per "${p.listingTitle}". L'agente è stato avvisato e ti risponderà a breve.\n\nVedi l'annuncio: ${p.listingUrl}\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.seekerName)},</p><p>Grazie per il tuo interesse per <strong>${esc(p.listingTitle)}</strong>. L'agente è stato avvisato e ti risponderà a breve.</p><p><a href="${esc(p.listingUrl)}">Vedi l'annuncio</a></p>`,
    ),
  };
}

export interface EnquiryOwnerParams {
  ownerName: string;
  seekerName: string;
  seekerEmail: string;
  seekerPhone?: string | null;
  contactWhatsappAvailable?: boolean;
  listingTitle: string;
  message: string;
  /** EC-1 — show badge only when both set and not expired. */
  b4aBandMaxCents?: number | null;
  b4aExpiresAt?: string | null;
}

function formatSeekerContact(p: EnquiryOwnerParams): string {
  const parts = [p.seekerEmail];
  if (p.seekerPhone) {
    parts.push(p.seekerPhone);
    if (p.contactWhatsappAvailable) parts.push('WhatsApp on this number');
  }
  return parts.filter(Boolean).join(', ');
}

function formatBandEuro(cents: number, locale: Locale): string {
  return formatBandMaxCentsEuro(cents, locale === 'en' ? 'en-US' : 'it-IT');
}

function formatB4aBadge(p: EnquiryOwnerParams, locale: Locale): string | null {
  if (p.b4aBandMaxCents == null || !p.b4aExpiresAt) return null;
  const band = formatBandEuro(p.b4aBandMaxCents, locale);
  if (locale === 'en') {
    return (
      `Affordability assessed · Banks4All\n` +
      `indicative range up to ${band} · valid to ${p.b4aExpiresAt}\n` +
      `Independent affordability assessment. Not a credit offer, approval or commitment by any lender.\n` +
      `Banks4All and EasyCasa are both part of the Mundida group.`
    );
  }
  return (
    `Affordabilità valutata · Banks4All\n` +
    `fascia indicativa fino a ${band} · valida fino al ${p.b4aExpiresAt}\n` +
    `Valutazione indipendente di affordability. Non è un'offerta di credito, un'approvazione o un impegno di alcun finanziatore.\n` +
    `Banks4All ed EasyCasa fanno entrambe parte del gruppo Mundida.`
  );
}

export function enquiryReceivedOwner(p: EnquiryOwnerParams, locale: Locale = 'it'): Rendered {
  const contactLine = formatSeekerContact(p);
  const badge = formatB4aBadge(p, locale);
  const badgeText = badge ? `\n\n${badge}\n` : '';
  const badgeHtml = badge
    ? `<pre style="font-family:ui-monospace,monospace;font-size:12px;white-space:pre-wrap;margin:16px 0;padding:12px;background:#f3ede1;border:1px solid #E7DFCF">${esc(badge)}</pre>`
    : '';
  if (locale === 'en') {
    return {
      subject: `New enquiry — ${p.listingTitle}`,
      text: `Hi ${p.ownerName},\n\n${p.seekerName} (${contactLine}) enquired about "${p.listingTitle}":\n\n"${p.message}"${badgeText}\nReply directly to get in touch.\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.ownerName)},</p><p><strong>${esc(p.seekerName)}</strong> (${esc(contactLine)}) enquired about <strong>${esc(p.listingTitle)}</strong>:</p><blockquote>${esc(p.message)}</blockquote>${badgeHtml}`,
      ),
    };
  }
  const whatsappNote = p.contactWhatsappAvailable ? ' — WhatsApp su questo numero' : '';
  const contactIt = p.seekerPhone
    ? `${p.seekerEmail}, ${p.seekerPhone}${whatsappNote}`
    : p.seekerEmail;
  return {
    subject: `Nuova richiesta — ${p.listingTitle}`,
    text: `Ciao ${p.ownerName},\n\n${p.seekerName} (${contactIt}) ha inviato una richiesta per "${p.listingTitle}":\n\n"${p.message}"${badgeText}\nRispondi per metterti in contatto.\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.ownerName)},</p><p><strong>${esc(p.seekerName)}</strong> (${esc(contactIt)}) ha inviato una richiesta per <strong>${esc(p.listingTitle)}</strong>:</p><blockquote>${esc(p.message)}</blockquote>${badgeHtml}`,
    ),
  };
}

export interface ViewingConfirmedParams {
  seekerName: string;
  listingTitle: string;
  address: string;
  whenLocal: string;
}
export function viewingConfirmed(p: ViewingConfirmedParams, locale: Locale = 'it'): Rendered {
  if (locale === 'en') {
    return {
      subject: `Viewing confirmed — ${p.listingTitle}`,
      text: `Hi ${p.seekerName},\n\nYour viewing is confirmed:\n\n${p.listingTitle}\n${p.address}\n${p.whenLocal}\n\nSee you there.\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.seekerName)},</p><p>Your viewing is confirmed:</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.address)}<br>${esc(p.whenLocal)}</p>`,
      ),
    };
  }
  return {
    subject: `Visita confermata — ${p.listingTitle}`,
    text: `Ciao ${p.seekerName},\n\nLa tua visita è confermata:\n\n${p.listingTitle}\n${p.address}\n${p.whenLocal}\n\nA presto.\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.seekerName)},</p><p>La tua visita è confermata:</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.address)}<br>${esc(p.whenLocal)}</p>`,
    ),
  };
}


export interface ViewingRequestedParams {
  conductorName: string;
  seekerName: string;
  listingTitle: string;
  areaLabel: string;
  whenLocal: string;
}
export function viewingRequested(p: ViewingRequestedParams, locale: Locale = 'it'): Rendered {
  if (locale === 'en') {
    return {
      subject: `Viewing requested — ${p.listingTitle}`,
      text: `Hi ${p.conductorName},\n\n${p.seekerName} requested a viewing:\n\n${p.listingTitle}\n${p.areaLabel}\n${p.whenLocal}\n\nConfirm or decline in EasyCasa.\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.conductorName)},</p><p><strong>${esc(p.seekerName)}</strong> requested a viewing:</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.areaLabel)}<br>${esc(p.whenLocal)}</p>`,
      ),
    };
  }
  return {
    subject: `Richiesta di visita — ${p.listingTitle}`,
    text: `Ciao ${p.conductorName},\n\n${p.seekerName} ha richiesto una visita:\n\n${p.listingTitle}\n${p.areaLabel}\n${p.whenLocal}\n\nConferma o rifiuta su EasyCasa.\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.conductorName)},</p><p><strong>${esc(p.seekerName)}</strong> ha richiesto una visita:</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.areaLabel)}<br>${esc(p.whenLocal)}</p>`,
    ),
  };
}

export interface ViewingCancelledParams {
  recipientName: string;
  listingTitle: string;
  whenLocal: string;
  areaLabel: string;
}
export function viewingCancelled(p: ViewingCancelledParams, locale: Locale = 'it'): Rendered {
  if (locale === 'en') {
    return {
      subject: `Viewing cancelled — ${p.listingTitle}`,
      text: `Hi ${p.recipientName},\n\nThe viewing was cancelled:\n\n${p.listingTitle}\n${p.areaLabel}\n${p.whenLocal}\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.recipientName)},</p><p>The viewing was cancelled:</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.areaLabel)}<br>${esc(p.whenLocal)}</p>`,
      ),
    };
  }
  return {
    subject: `Visita annullata — ${p.listingTitle}`,
    text: `Ciao ${p.recipientName},\n\nLa visita è stata annullata:\n\n${p.listingTitle}\n${p.areaLabel}\n${p.whenLocal}\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.recipientName)},</p><p>La visita è stata annullata:</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.areaLabel)}<br>${esc(p.whenLocal)}</p>`,
    ),
  };
}

export interface ViewingReminderParams {
  seekerName: string;
  listingTitle: string;
  address: string;
  whenLocal: string;
  hoursBefore: 24 | 2;
}
export function viewingReminder(p: ViewingReminderParams, locale: Locale = 'it'): Rendered {
  const when = p.hoursBefore === 24 ? (locale === 'en' ? 'tomorrow' : 'domani') : (locale === 'en' ? 'in 2 hours' : 'tra 2 ore');
  if (locale === 'en') {
    return {
      subject: `Reminder: viewing ${when} — ${p.listingTitle}`,
      text: `Hi ${p.seekerName},\n\nReminder: your viewing is ${when}.\n\n${p.listingTitle}\n${p.address}\n${p.whenLocal}\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.seekerName)},</p><p>Reminder: your viewing is <strong>${esc(when)}</strong>.</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.address)}<br>${esc(p.whenLocal)}</p>`,
      ),
    };
  }
  return {
    subject: `Promemoria visita ${when} — ${p.listingTitle}`,
    text: `Ciao ${p.seekerName},\n\nPromemoria: la tua visita è ${when}.\n\n${p.listingTitle}\n${p.address}\n${p.whenLocal}\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.seekerName)},</p><p>Promemoria: la tua visita è <strong>${esc(when)}</strong>.</p><p><strong>${esc(p.listingTitle)}</strong><br>${esc(p.address)}<br>${esc(p.whenLocal)}</p>`,
    ),
  };
}

export interface AlertListing {
  title: string;
  priceLabel: string;
  url: string;
}
export interface SavedSearchAlertParams {
  seekerName: string;
  searchName: string;
  listings: AlertListing[];
}
export function savedSearchAlert(p: SavedSearchAlertParams, locale: Locale = 'it'): Rendered {
  const n = p.listings.length;
  const itemsText = p.listings.map((l) => `• ${l.title} — ${l.priceLabel}\n  ${l.url}`).join('\n');
  const itemsHtml = p.listings
    .map((l) => `<li><a href="${esc(l.url)}">${esc(l.title)}</a> — ${esc(l.priceLabel)}</li>`)
    .join('');
  if (locale === 'en') {
    return {
      subject: `${n} new ${n === 1 ? 'match' : 'matches'} for "${p.searchName}"`,
      text: `Hi ${p.seekerName},\n\n${n} new ${n === 1 ? 'listing matches' : 'listings match'} your saved search "${p.searchName}":\n\n${itemsText}\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.seekerName)},</p><p>${n} new ${n === 1 ? 'listing matches' : 'listings match'} your saved search <strong>${esc(p.searchName)}</strong>:</p><ul>${itemsHtml}</ul>`,
      ),
    };
  }
  return {
    subject: `${n} ${n === 1 ? 'nuovo annuncio' : 'nuovi annunci'} per "${p.searchName}"`,
    text: `Ciao ${p.seekerName},\n\n${n} ${n === 1 ? 'nuovo annuncio corrisponde' : 'nuovi annunci corrispondono'} alla tua ricerca salvata "${p.searchName}":\n\n${itemsText}\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.seekerName)},</p><p>${n} ${n === 1 ? 'nuovo annuncio corrisponde' : 'nuovi annunci corrispondono'} alla tua ricerca salvata <strong>${esc(p.searchName)}</strong>:</p><ul>${itemsHtml}</ul>`,
    ),
  };
}

export interface AsteGuideParams {
  guideUrl: string;
  language: Locale;
}

/** EC-21 — deliver the Aste guide link + early-access note after lead signup. */
export function asteGuideDelivery(p: AsteGuideParams, locale: Locale = 'it'): Rendered {
  const lang = locale === 'en' || locale === 'es' ? locale : 'it';
  if (lang === 'en') {
    return {
      subject: 'Your Italian Property Auction Guide — EasyCasa',
      text:
        `Thanks for signing up.\n\n` +
        `Open your free guide here:\n${p.guideUrl}\n\n` +
        `You're also on the early-access list for Analisi Aste (coming soon) — structured analysis of auction documents in your language.\n\n` +
        `You can unsubscribe at any time by replying to this email.\n\n— EasyCasa`,
      html: wrap(
        `<p>Thanks for signing up.</p>` +
          `<p><a href="${esc(p.guideUrl)}">Open your free guide</a></p>` +
          `<p>You're also on the early-access list for <strong>Analisi Aste</strong> (coming soon) — structured analysis of auction documents in your language.</p>` +
          `<p style="color:#6b6b6b;font-size:13px">You can unsubscribe at any time by replying to this email.</p>`,
      ),
    };
  }
  if (lang === 'es') {
    // ES derived — FLAG for owner review
    return {
      subject: 'Tu Guía de Subastas Inmobiliarias — EasyCasa',
      text:
        `Gracias por registrarte.\n\n` +
        `Abre tu guía gratuita aquí:\n${p.guideUrl}\n\n` +
        `También estás en la lista de acceso anticipado a Analisi Aste (próximamente) — análisis estructurado de documentos de subasta en tu idioma.\n\n` +
        `Puedes darte de baja en cualquier momento respondiendo a este correo.\n\n— EasyCasa`,
      html: wrap(
        `<p>Gracias por registrarte.</p>` +
          `<p><a href="${esc(p.guideUrl)}">Abre tu guía gratuita</a></p>` +
          `<p>También estás en la lista de acceso anticipado a <strong>Analisi Aste</strong> (próximamente) — análisis estructurado de documentos de subasta en tu idioma.</p>` +
          `<p style="color:#6b6b6b;font-size:13px">Puedes darte de baja en cualquier momento respondiendo a este correo.</p>`,
      ),
    };
  }
  return {
    subject: 'La tua Guida alle Aste Immobiliari — EasyCasa',
    text:
      `Grazie per l'iscrizione.\n\n` +
      `Apri la guida gratuita qui:\n${p.guideUrl}\n\n` +
      `Sei anche in lista per l'accesso anticipato ad Analisi Aste (in arrivo) — analisi strutturata dei documenti d'asta nella tua lingua.\n\n` +
      `Puoi annullare l'iscrizione in ogni momento rispondendo a questa email.\n\n— EasyCasa`,
    html: wrap(
      `<p>Grazie per l'iscrizione.</p>` +
        `<p><a href="${esc(p.guideUrl)}">Apri la guida gratuita</a></p>` +
        `<p>Sei anche in lista per l'accesso anticipato ad <strong>Analisi Aste</strong> (in arrivo) — analisi strutturata dei documenti d'asta nella tua lingua.</p>` +
        `<p style="color:#6b6b6b;font-size:13px">Puoi annullare l'iscrizione in ogni momento rispondendo a questa email.</p>`,
    ),
  };
}
