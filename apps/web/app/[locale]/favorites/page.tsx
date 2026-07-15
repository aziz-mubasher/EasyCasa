import { useTranslations } from 'next-intl';

export default function FavoritesPage() {
  const t = useTranslations('nav');
  return (
    <section className="mx-auto max-w-7xl px-5 py-12">
      <h1 className="font-display text-3xl font-semibold">{t('favorites')}</h1>
      <p className="text-muted mt-3">
        {/* Wired to GET /me/favorites once auth session is connected in Phase 4. */}
        Accedi per vedere gli immobili salvati.
      </p>
    </section>
  );
}
