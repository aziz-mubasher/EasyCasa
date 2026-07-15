import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  const tb = useTranslations('brand');
  return (
    <footer className="border-t border-line mt-16">
      <div className="mx-auto max-w-7xl px-5 py-10 flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="font-display text-lg font-semibold">{tb('name')}</div>
          <p className="text-muted text-sm max-w-sm">{tb('tagline')}</p>
        </div>
        <p className="data text-xs text-muted self-end">
          © {new Date().getFullYear()} MUNDIDA · {t('rights')}
        </p>
      </div>
    </footer>
  );
}
