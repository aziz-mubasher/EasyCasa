'use client';

import { useId, useEffect, useState, type ReactNode } from 'react';

type TabId = 'details' | 'description' | 'valuation' | 'location';

const HASH_TO_TAB: Record<string, TabId> = {
  details: 'details',
  description: 'description',
  valuation: 'valuation',
  evaluation: 'valuation',
  location: 'location',
};

export function ListingDetailTabs({
  tablistLabel,
  labels,
  details,
  description,
  location,
  valuation,
  hasDescription,
  hasLocation,
}: {
  tablistLabel: string;
  labels: Record<TabId, string>;
  details: ReactNode;
  description: ReactNode;
  location: ReactNode;
  valuation: ReactNode;
  hasDescription: boolean;
  hasLocation: boolean;
}) {
  const baseId = useId();
  const tabs: { id: TabId; label: string; panel: ReactNode; hidden?: boolean }[] = [
    { id: 'details', label: labels.details, panel: details },
    { id: 'description', label: labels.description, panel: description, hidden: !hasDescription },
    { id: 'valuation', label: labels.valuation, panel: valuation },
    { id: 'location', label: labels.location, panel: location, hidden: !hasLocation },
  ];
  const visible = tabs.filter((t) => !t.hidden);
  const visibleKey = visible.map((t) => t.id).join(',');
  const [active, setActive] = useState<TabId>(visible[0]?.id ?? 'details');

  useEffect(() => {
    const applyHash = () => {
      const raw = window.location.hash.replace(/^#/, '').toLowerCase();
      const id = HASH_TO_TAB[raw];
      if (id && visibleKey.split(',').includes(id)) setActive(id);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [visibleKey]);

  const select = (id: TabId) => {
    setActive(id);
    const next = `#${id}`;
    if (window.location.hash !== next) {
      window.history.replaceState(null, '', next);
    }
  };

  return (
    <div className="mt-10 scroll-mt-24" id="listing-sections">
      <div
        role="tablist"
        aria-label={tablistLabel}
        className="flex flex-wrap gap-1 border-b border-line sticky top-14 z-20 bg-paper/95 backdrop-blur-sm pt-1"
      >
        {visible.map((tab) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(tab.id)}
              className={`px-4 py-2.5 text-sm font-[var(--font-display)] transition border-b-2 -mb-px ${
                selected ? 'border-azure text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {visible.map((tab) => {
        const selected = active === tab.id;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            hidden={!selected}
            className="py-8"
          >
            {tab.panel}
          </div>
        );
      })}
    </div>
  );
}
