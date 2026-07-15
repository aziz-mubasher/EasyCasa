import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <section className="mx-auto max-w-7xl px-5">
      <div className="grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
        <div>
          <p className="eyebrow mb-4">{t('eyebrow')} · 41.9°N 12.5°E</p>
          <h1 className="font-display text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
            {t('title')}
          </h1>
          <p className="mt-5 text-lg text-muted max-w-md">{t('subtitle')}</p>
          <div className="mt-8">
            <Link href="/search"><Button>{t('cta')}</Button></Link>
          </div>
        </div>
        {/* Signature: a cadastral-style panel — coordinate grid framing the map entry */}
        <div className="relative aspect-square rounded-xl2 border border-line bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] overflow-hidden">
          <div className="absolute inset-0 grid place-items-center">
            <div className="data text-xs text-muted text-center">
              <div className="text-4xl text-ink mb-2">🗺</div>
              IT · 20 regioni
            </div>
          </div>
          <span className="eyebrow absolute bottom-3 left-3">foglio · particella</span>
        </div>
      </div>
    </section>
  );
}
