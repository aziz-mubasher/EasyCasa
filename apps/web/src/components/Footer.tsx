import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export function Footer() {
  const t = useTranslations('footer');
  const tb = useTranslations('brand');
  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-7xl px-5 py-10 flex flex-col md:flex-row justify-between gap-6">
        <div className="space-y-3 max-w-lg">
          <div className="font-display text-lg font-semibold">{tb('name')}</div>
          <p className="text-muted text-sm">{tb('tagline')}</p>
          <p className="text-muted text-xs leading-relaxed">{t('disclosure')}</p>
          <Link href="/pricing" className="text-sm text-azure hover:underline">
            {t('pricing')}
          </Link>
        </div>
        <p className="data text-xs text-muted self-end">
          © {new Date().getFullYear()} MUNDIDA · {t('rights')}
        </p>
      </div>
    </footer>
  );
}
