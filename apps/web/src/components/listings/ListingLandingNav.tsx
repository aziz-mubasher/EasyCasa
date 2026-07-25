'use client';

import { useEffect, useState } from 'react';

type Section = { id: string; label: string };

export function ListingLandingNav({
  tablistLabel,
  sections,
}: {
  tablistLabel: string;
  sections: Section[];
}) {
  const [active, setActive] = useState(sections[0]?.id ?? 'details');

  useEffect(() => {
    const els = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActive(id);
      },
      { rootMargin: '-20% 0px -55% 0px', threshold: [0.1, 0.35, 0.6] },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  const jump = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  };

  return (
    <nav
      aria-label={tablistLabel}
      className="sticky top-14 z-20 border-b border-line bg-paper/95 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl px-5 flex flex-wrap gap-1 pt-1">
        {sections.map((section) => {
          const selected = active === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => jump(section.id)}
              className={`px-4 py-2.5 text-sm font-[var(--font-display)] transition border-b-2 -mb-px ${
                selected ? 'border-azure text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
