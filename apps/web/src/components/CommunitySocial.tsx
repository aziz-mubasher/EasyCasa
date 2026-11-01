'use client';

import { useEffect, useId, useState } from 'react';
import { ICONS, SCRIPT_FONT_HREF, socialView, type SocialNetwork } from '@/lib/community-social';
import './community-social.css';

export function CommunitySocial({
  locale,
  kind,
  headingId,
}: {
  locale: string;
  kind: 'follow' | 'community';
  headingId?: string;
}) {
  const reactId = useId();
  const labelId = headingId || `soc-${reactId.replace(/:/g, '')}`;
  const view = socialView(locale, { kind });
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 719px)');
    const sync = () => setOpen(!mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <section className="soc" aria-labelledby={labelId}>
      <link rel="stylesheet" href={SCRIPT_FONT_HREF} />
      <h2 className="soc-heading" id={labelId}>
        {view.heading}
      </h2>
      <ul className="soc-primary">
        {view.primary.map((item) => (
          <li key={item.id}>
            <a
              className="soc-icon"
              dir="ltr"
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={item.aria}
              dangerouslySetInnerHTML={{ __html: ICONS[item.id as SocialNetwork] }}
            />
          </li>
        ))}
      </ul>
      <details className="soc-other" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
        <summary>{view.otherLabel}</summary>
        <ul className="soc-list">
          {view.rows.map((row) => (
            <li key={row.id} className={row.current ? 'soc-row is-current' : 'soc-row'} aria-current={row.current ? 'true' : undefined}>
              <a
                className="soc-name"
                href={row.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={row.facebookAria}
              >
                <span lang={row.lang} dir={row.dir}>
                  {row.label}
                </span>
              </a>
              <span className="soc-mini">
                {row.others.map((item) => (
                  <a
                    key={item.id}
                    className="soc-icon soc-icon--mini"
                    dir="ltr"
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.aria}
                    dangerouslySetInnerHTML={{ __html: ICONS[item.id as SocialNetwork] }}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
