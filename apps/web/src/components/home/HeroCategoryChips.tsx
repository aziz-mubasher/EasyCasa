import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export async function HeroCategoryChips({
  categories,
}: {
  categories: Array<{ slug: string; name: string }>;
}) {
  const t = await getTranslations('home');
  return (
    <ul className="flex flex-wrap gap-2 list-none p-0 m-0" aria-label={t('categoryChipsLabel')}>
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/search?categorySlug=${encodeURIComponent(c.slug)}`}
            className="inline-block rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-ink hover:bg-sand/40 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
