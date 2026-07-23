'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { suggestLocations, type LocationSuggestion } from '@/lib/api';
import { useSearchUrlState } from './useSearchUrlState';

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('search');
  const { get, setMany } = useSearchUrlState();
  const [query, setQuery] = useState(get('q') || get('city') || '');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      suggestLocations(query, ctrl.signal)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const applySuggestion = useCallback(
    (s: LocationSuggestion) => {
      const updates: Record<string, string | null> = { q: null, city: null, provinceSlug: null, regionSlug: null };
      if (s.kind === 'comune') {
        updates.city = s.label;
        if (s.provinceSlug) updates.provinceSlug = s.provinceSlug;
        if (s.regionSlug) updates.regionSlug = s.regionSlug;
        setQuery(s.label);
      } else if (s.kind === 'provincia') {
        updates.provinceSlug = s.slug;
        if (s.regionSlug) updates.regionSlug = s.regionSlug;
        setQuery(s.label);
      } else {
        updates.regionSlug = s.slug;
        setQuery(s.label);
      }
      setMany(updates);
      setOpen(false);
    },
    [setMany],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && suggestions[active]) {
      applySuggestion(suggestions[active]);
      return;
    }
    setMany({ q: query.trim() || null, city: null });
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className={`relative ${compact ? 'w-full' : 'w-full max-w-2xl'}`}>
      <form onSubmit={onSubmit} role="search" aria-label={t('searchPlaceholder')}>
        <div className={`relative flex items-center rounded-xl border border-line bg-paper ${compact ? 'shadow-sm' : 'shadow-md'}`}>
          <span className="pl-4 text-muted pointer-events-none" aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActive(-1);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={t('searchPlaceholder')}
            aria-autocomplete="list"
            aria-controls={open && suggestions.length ? listId : undefined}
            aria-expanded={open && suggestions.length > 0}
            className="w-full bg-transparent px-3 py-3 text-base font-[var(--font-body)] focus:outline-none"
          />
          <button
            type="submit"
            className="mr-2 rounded-full bg-azure text-paper px-4 py-2 text-sm font-medium hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-azure"
          >
            {t('searchButton')}
          </button>
        </div>
      </form>
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-40 mt-1 w-full max-w-2xl rounded-xl border border-line bg-paper shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li key={`${s.kind}-${s.slug}-${s.label}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySuggestion(s)}
                className={`w-full text-left px-4 py-3 hover:bg-sand/60 transition ${i === active ? 'bg-sand/60' : ''}`}
              >
                <span className="font-display font-medium block">{s.label}</span>
                <span className="text-xs text-muted">{s.hierarchy}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
