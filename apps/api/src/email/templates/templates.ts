/**
 * Transactional email templates for the seeker pilot — Phase 36 / 36.1.
 * Pure functions: (params, locale) -> { subject, text, html }.
 */
export type Locale = 'it' | 'en';

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
  listingTitle: string;
  message: string;
}
export function enquiryReceivedOwner(p: EnquiryOwnerParams, locale: Locale = 'it'): Rendered {
  if (locale === 'en') {
    return {
      subject: `New enquiry — ${p.listingTitle}`,
      text: `Hi ${p.ownerName},\n\n${p.seekerName} (${p.seekerEmail}) enquired about "${p.listingTitle}":\n\n"${p.message}"\n\nReply directly to get in touch.\n\n— EasyCasa`,
      html: wrap(
        `<p>Hi ${esc(p.ownerName)},</p><p><strong>${esc(p.seekerName)}</strong> (${esc(p.seekerEmail)}) enquired about <strong>${esc(p.listingTitle)}</strong>:</p><blockquote>${esc(p.message)}</blockquote>`,
      ),
    };
  }
  return {
    subject: `Nuova richiesta — ${p.listingTitle}`,
    text: `Ciao ${p.ownerName},\n\n${p.seekerName} (${p.seekerEmail}) ha inviato una richiesta per "${p.listingTitle}":\n\n"${p.message}"\n\nRispondi per metterti in contatto.\n\n— EasyCasa`,
    html: wrap(
      `<p>Ciao ${esc(p.ownerName)},</p><p><strong>${esc(p.seekerName)}</strong> (${esc(p.seekerEmail)}) ha inviato una richiesta per <strong>${esc(p.listingTitle)}</strong>:</p><blockquote>${esc(p.message)}</blockquote>`,
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
