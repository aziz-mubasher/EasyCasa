import Image from 'next/image';
import { getTranslations } from 'next-intl/server';

import { SmartLinkQrCode } from '@/components/smartlink/SmartLinkQrCode';
import { SmartLinkSocialRow, socialLinksFromAgent } from '@/components/smartlink/SmartLinkSocialRow';
import { fetchPublicAgentBySlug, telHref, type PublicAgentProfile } from '@/lib/agent-public';
import type { SmartLinkPublicPayload } from '@/lib/smartlink';
import { smartLinkPublicUrl } from '@/lib/smartlink';

type Props = {
  locale: string;
  token: string;
  data: Pick<SmartLinkPublicPayload, 'agent' | 'agency'>;
};

function mergeAgent(
  snapshot: SmartLinkPublicPayload['agent'],
  profile: PublicAgentProfile | null,
): { name: string; phone: string | null; bio: string | null; avatarUrl: string | null } {
  return {
    name: profile?.displayName ?? snapshot.displayName ?? '',
    phone: profile?.phone ?? snapshot.phone,
    bio: profile?.bio ?? snapshot.bio,
    avatarUrl: profile?.avatarUrl ?? null,
  };
}

export async function SmartLinkAgentCard({ locale, token, data }: Props) {
  const t = await getTranslations('smartlink.agentCard');
  const ts = await getTranslations('smartlink');
  const tb = await getTranslations('brand');
  const profile = await fetchPublicAgentBySlug(data.agent.slug);
  const agent = mergeAgent(data.agent, profile);
  const agentName = agent.name || t('defaultName');
  const publicUrl = smartLinkPublicUrl(token, locale);
  const socials = socialLinksFromAgent(agent.phone);
  const tel = telHref(agent.phone);

  return (
    <section
      aria-labelledby="smartlink-agent-heading"
      className="mx-auto max-w-6xl px-5 py-8"
    >
      <div className="relative rounded-xl2 border border-line bg-paper p-6 shadow-sm md:p-8">
        <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-ink">
              {tb('name')}
              <span className="text-azure">.</span>
            </p>
            <p className="text-xs text-muted">{t('brandSubtitle')}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
            <div className="mx-auto md:mx-0">
              {agent.avatarUrl ? (
                <Image
                  src={agent.avatarUrl}
                  alt={t('photoAlt', { name: agentName })}
                  width={120}
                  height={150}
                  className="h-[150px] w-[120px] rounded-lg border border-line object-cover"
                  priority
                />
              ) : (
                <div
                  className="flex h-[150px] w-[120px] items-center justify-center rounded-lg border border-line bg-sand/60 font-display text-lg text-muted"
                  role="img"
                  aria-label={t('photoAlt', { name: agentName })}
                >
                  {agentName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="text-center md:text-left">
              <h1 id="smartlink-agent-heading" className="font-display text-2xl font-semibold text-ink">
                {agentName}
              </h1>
              <p className="mt-2 text-sm text-muted">{ts('positioning')}</p>
              <p className="text-sm text-muted">{ts('taglineSecondary')}</p>
              {tel ? (
                <p className="mt-3 data text-lg text-ink">
                  <a href={tel} className="text-azure hover:underline">
                    {agent.phone}
                  </a>
                </p>
              ) : null}
              {agent.bio ? <p className="mt-2 text-sm text-muted max-w-md">{agent.bio}</p> : null}
            </div>
          </div>

          <div className="hidden lg:block">
            <SmartLinkQrCode url={publicUrl} label={t('qrLabel', { url: publicUrl })} />
          </div>
        </div>

        <dl className="mt-8 grid gap-3 border-t border-line pt-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="eyebrow">{t('phoneLabel')}</dt>
            <dd className="mt-0.5 text-ink">
              {tel ? (
                <a href={tel} className="text-azure hover:underline">
                  {agent.phone}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="eyebrow">{t('emailLabel')}</dt>
            <dd className="mt-0.5">
              <a href={`mailto:${data.agency.email}`} className="text-azure hover:underline">
                {data.agency.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="eyebrow">{t('agencyLabel')}</dt>
            <dd className="mt-0.5 text-ink">{data.agency.name}</dd>
          </div>
        </dl>

        <SmartLinkSocialRow links={socials} />

        <div className="mt-6 flex justify-end lg:hidden">
          <SmartLinkQrCode url={publicUrl} label={t('qrLabel', { url: publicUrl })} />
        </div>
      </div>
    </section>
  );
}
