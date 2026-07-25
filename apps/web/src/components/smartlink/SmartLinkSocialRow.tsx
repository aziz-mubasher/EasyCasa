import { getTranslations } from 'next-intl/server';

import { whatsAppHref } from '@/lib/agent-public';

export type AgentSocialLinks = {
  whatsApp: string | null;
  facebook: string | null;
  telegram: string | null;
  instagram: string | null;
  website: string | null;
};

export function socialLinksFromAgent(phone: string | null | undefined): AgentSocialLinks {
  return {
    whatsApp: whatsAppHref(phone),
    facebook: null,
    telegram: null,
    instagram: null,
    website: null,
  };
}

const ORDER: (keyof AgentSocialLinks)[] = ['whatsApp', 'facebook', 'telegram', 'instagram', 'website'];

export async function SmartLinkSocialRow({ links }: { links: AgentSocialLinks }) {
  const t = await getTranslations('smartlink.social');
  const entries = ORDER.filter((key) => links[key]);

  if (entries.length === 0) return null;

  return (
    <ul className="flex flex-wrap justify-center gap-2 pt-2">
      {entries.map((key) => (
        <li key={key}>
          <a
            href={links[key]!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-full border border-line bg-sand/50 px-3 py-1.5 text-xs font-medium text-ink hover:border-azure hover:text-azure"
          >
            {t(key)}
          </a>
        </li>
      ))}
    </ul>
  );
}
