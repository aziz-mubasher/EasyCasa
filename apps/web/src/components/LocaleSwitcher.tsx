'use client';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <div className="data flex gap-1 text-xs">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => router.replace(pathname, { locale: l })}
          className={`px-1.5 py-0.5 rounded uppercase ${l === locale ? 'text-ink' : 'text-muted hover:text-ink'}`}
          aria-current={l === locale ? 'true' : undefined}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
