import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import './aste-lab-entry.css';

/** Shown on /aste when preview or public build arg mounts analisi routes. */
export async function AsteLabEntryBanner() {
  const t = await getTranslations('asteLab');
  return (
    <aside className="alab-entry" aria-label={t('entry.aria')}>
      <div className="alab-entry-wrap">
        <p>
          <strong>{t('entry.title')}</strong> {t('entry.body')}
        </p>
        <Link className="alab-entry-link" href="/aste/lab">
          {t('entry.cta')}
        </Link>
      </div>
    </aside>
  );
}
