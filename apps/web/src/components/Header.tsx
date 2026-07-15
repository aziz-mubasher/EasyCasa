import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { LocaleSwitcher } from './LocaleSwitcher';

export function Header() {
  const t = useTranslations('nav');
  const tb = useTranslations('brand');
  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          {tb('name')}<span className="text-azure">.</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/search" className="hover:text-azure">{t('search')}</Link>
          <Link href="/add" className="hover:text-azure">{t('add')}</Link>
          <Link href="/favorites" className="hover:text-azure">{t('favorites')}</Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
