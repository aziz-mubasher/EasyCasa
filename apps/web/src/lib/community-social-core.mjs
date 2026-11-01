/** Language-community social block. URLs come only from social-links.json. */

export const COMMUNITY_ORDER = ["it", "en", "es", "ur", "hi", "ar", "bn"];
export const NETWORKS = ["facebook", "instagram", "tiktok", "youtube"];

export const NETWORK_NAMES = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const LABEL_META = {
  it: { lang: "it", dir: "ltr" },
  en: { lang: "en", dir: "ltr" },
  es: { lang: "es", dir: "ltr" },
  ur: { lang: "ur", dir: "rtl" },
  hi: { lang: "hi", dir: "ltr" },
  ar: { lang: "ar", dir: "rtl" },
  bn: { lang: "bn", dir: "ltr" },
};

export const SCRIPT_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Amiri&family=Hind+Siliguri:wght@500;600&family=Noto+Nastaliq+Urdu&family=Noto+Sans+Bengali:wght@500;600&family=Noto+Sans+Devanagari:wght@500;600&display=swap";

const COPY = {
  it: {
    follow: "Seguici",
    community: "Community Ayni Group Italia",
    other: "Altre lingue",
    on: (network, label) => `Ayni Group Italia su ${network} (${label})`,
  },
  en: {
    follow: "Follow us",
    community: "Ayni Group Italia community",
    other: "Other languages",
    on: (network, label) => `Ayni Group Italia on ${network} (${label})`,
  },
  es: {
    follow: "Síguenos",
    community: "Comunidad Ayni Group Italia",
    other: "Otros idiomas",
    on: (network, label) => `Ayni Group Italia en ${network} (${label})`,
  },
  fr: {
    follow: "Suivez-nous",
    community: "Communauté Ayni Group Italia",
    other: "Autres langues",
    on: (network, label) => `Ayni Group Italia sur ${network} (${label})`,
  },
  ur: {
    follow: "ہمیں فالو کریں",
    community: "Ayni Group Italia کمیونٹی",
    other: "دیگر زبانیں",
    on: (network, label) => `Ayni Group Italia، ${network} (${label})`,
  },
  ar: {
    follow: "تابعونا",
    community: "مجتمع Ayni Group Italia",
    other: "لغات أخرى",
    on: (network, label) => `Ayni Group Italia على ${network} (${label})`,
  },
  bn: {
    follow: "আমাদের অনুসরণ করুন",
    community: "Ayni Group Italia সম্প্রদায়",
    other: "অন্যান্য ভাষা",
    on: (network, label) => `Ayni Group Italia, ${network} (${label})`,
  },
  urhi: {
    follow: "Follow karein",
    community: "Ayni Group Italia community",
    other: "Doosri zubaanen",
    on: (network, label) => `Ayni Group Italia, ${network} (${label})`,
  },
};

export const ICONS = {
  facebook:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.5 8.5V6.8c0-.5.3-.8.8-.8H17V3.5h-2.2C12.2 3.5 11 5 11 7.2V8.5H9v2.6h2V20h2.8v-8.9h2.3l.4-2.6h-2.7z"/></svg>',
  instagram:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5zm8 1.8H8A3.2 3.2 0 0 0 4.8 8v8A3.2 3.2 0 0 0 8 19.2h8A3.2 3.2 0 0 0 19.2 16V8A3.2 3.2 0 0 0 16 4.8zM12 8.2A3.8 3.8 0 1 1 8.2 12 3.8 3.8 0 0 1 12 8.2zm0 1.6A2.2 2.2 0 1 0 14.2 12 2.2 2.2 0 0 0 12 9.8zM17.2 6.5a1 1 0 1 1-1 1 1 1 0 0 1 1-1z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M14.5 3c.4 2.4 1.7 4 4 4.4v2.5c-1.4 0-2.7-.4-4-1.2v6.6c0 3.3-2.6 5.7-5.8 5.7S3 18.6 3 15.3 5.6 9.6 8.8 9.6c.3 0 .7 0 1 .1v2.7c-.3-.1-.6-.2-1-.2-1.8 0-3.2 1.4-3.2 3.1s1.4 3.1 3.2 3.1 3.1-1.4 3.1-3.1V3h2.6z"/></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M22 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C18.2 5.4 12 5.4 12 5.4s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9 2 12.2 2 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM10 15.5v-6.6l5.2 3.3-5.2 3.3z"/></svg>',
};

function copyFor(locale) {
  const raw = String(locale ?? "").trim();
  if (COPY[raw]) return COPY[raw];
  const lower = raw.toLowerCase();
  if (COPY[lower]) return COPY[lower];
  const primary = lower.split("-")[0];
  if (COPY[primary]) return COPY[primary];
  return COPY.en;
}

export function communityForLocale(locale, links) {
  const table = links.localeToCommunity || {};
  const raw = String(locale ?? "").trim();
  const candidates = [raw, raw.toLowerCase(), raw.toLowerCase().split("-")[0]];
  for (const key of candidates) {
    const id = table[key];
    if (id && links.communities[id]) return id;
  }
  const fallback = links.fallbackCommunity || "en";
  return links.communities[fallback] ? fallback : "en";
}

export function orderedCommunityIds(current) {
  return [current, ...COMMUNITY_ORDER.filter((id) => id !== current)];
}

export function facebookSameAs(links) {
  return COMMUNITY_ORDER.map((id) => links.communities[id].facebook);
}

export function buildSocialView(locale, links, options = {}) {
  const kind = options.kind === "follow" ? "follow" : "community";
  const copy = copyFor(locale);
  const communityId = communityForLocale(locale, links);
  const community = links.communities[communityId];
  const primary = NETWORKS.map((id) => ({
    id,
    name: NETWORK_NAMES[id],
    href: community[id],
    aria: copy.on(NETWORK_NAMES[id], community.label),
  }));
  const rows = orderedCommunityIds(communityId).map((id) => {
    const row = links.communities[id];
    const meta = LABEL_META[id];
    return {
      id,
      label: row.label,
      lang: meta.lang,
      dir: meta.dir,
      current: id === communityId,
      facebook: row.facebook,
      facebookAria: copy.on("Facebook", row.label),
      others: NETWORKS.filter((net) => net !== "facebook").map((net) => ({
        id: net,
        name: NETWORK_NAMES[net],
        href: row[net],
        aria: copy.on(NETWORK_NAMES[net], row.label),
      })),
    };
  });
  return {
    version: links.version,
    heading: kind === "follow" ? copy.follow : copy.community,
    otherLabel: copy.other,
    communityId,
    primary,
    rows,
  };
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconLink(item, className) {
  return `<a class="${className}" dir="ltr" href="${esc(item.href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(item.aria)}">${ICONS[item.id]}</a>`;
}

export function renderCommunitySocialHtml(locale, links, options = {}) {
  const view = buildSocialView(locale, links, options);
  const headingId = options.headingId || "soc-heading";
  const primary = view.primary
    .map((item) => `<li>${iconLink(item, "soc-icon")}</li>`)
    .join("");
  const rows = view.rows
    .map((row) => {
      const mini = row.others.map((item) => iconLink(item, "soc-icon soc-icon--mini")).join("");
      const current = row.current ? " is-current" : "";
      const ariaCurrent = row.current ? ' aria-current="true"' : "";
      return `<li class="soc-row${current}"${ariaCurrent}><a class="soc-name" href="${esc(row.facebook)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(row.facebookAria)}"><span lang="${esc(row.lang)}" dir="${esc(row.dir)}">${esc(row.label)}</span></a><span class="soc-mini">${mini}</span></li>`;
    })
    .join("");
  return `<section class="soc" aria-labelledby="${esc(headingId)}"><h2 class="soc-heading" id="${esc(headingId)}">${esc(view.heading)}</h2><ul class="soc-primary">${primary}</ul><details class="soc-other" open><summary>${esc(view.otherLabel)}</summary><ul class="soc-list">${rows}</ul></details></section>`;
}
