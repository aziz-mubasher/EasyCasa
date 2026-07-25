'use client';

import { useId, useState, type ReactNode } from 'react';

type TabId = 'details' | 'description' | 'location' | 'valuation';

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
    { id: 'location', label: labels.location, panel: location, hidden: !hasLocation },
    { id: 'valuation', label: labels.valuation, panel: valuation },
  ];
  const visible = tabs.filter((t) => !t.hidden);
  const [active, setActive] = useState<TabId>(visible[0]?.id ?? 'details');

  return (
    <div className="mt-10">
      <div role="tablist" aria-label={tablistLabel} className="flex flex-wrap gap-1 border-b border-line">
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
              onClick={() => setActive(tab.id)}
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
