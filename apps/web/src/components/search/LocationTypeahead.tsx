'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { suggestLocations, type LocationSuggestion } from '@/lib/api';

export type LocationSelection = {
  query: string;
  city: string | null;
  provinceSlug: string | null;
  regionSlug: string | null;
  q: string | null;
};

export const emptyLocationSelection = (): LocationSelection => ({
  query: '',
  city: null,
  provinceSlug: null,
  regionSlug: null,
  q: null,
});

function selectionFromSuggestion(s: LocationSuggestion): LocationSelection {
  if (s.kind === 'comune') {
    return {
      query: s.label,
      city: s.label,
      provinceSlug: s.provinceSlug ?? null,
      regionSlug: s.regionSlug ?? null,
      q: null,
    };
  }
  if (s.kind === 'provincia') {
    return {
      query: s.label,
      city: null,
      provinceSlug: s.slug,
      regionSlug: s.regionSlug ?? null,
      q: null,
    };
  }
  return {
    query: s.label,
    city: null,
    provinceSlug: null,
    regionSlug: s.slug,
    q: null,
  };
}

export function locationSelectionToParams(sel: LocationSelection): Record<string, string | null> {
  return {
    q: sel.q,
    city: sel.city,
    provinceSlug: sel.provinceSlug,
    regionSlug: sel.regionSlug,
  };
}

export function LocationTypeahead({
  value,
  onChange,
  onSelect,
  id: idProp,
  labelledBy,
  ariaLabel,
  placeholder,
  className = '',
  inputClassName = '',
  listClassName = '',
  showSearchIcon = true,
}: {
  value: string;
  onChange: (query: string) => void;
  onSelect: (selection: LocationSelection) => void;
  id?: string;
  labelledBy?: string;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  listClassName?: string;
  showSearchIcon?: boolean;
}) {
  const t = useTranslations('search');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listId = `${inputId}-list`;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      suggestLocations(value, ctrl.signal)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const applySuggestion = useCallback(
    (s: LocationSuggestion) => {
      const sel = selectionFromSuggestion(s);
      onChange(sel.query);
      onSelect(sel);
      setOpen(false);
    },
    [onChange, onSelect],
  );

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
    } else if (e.key === 'Enter' && active >= 0 && suggestions[active]) {
      e.preventDefault();
      applySuggestion(suggestions[active]);
    }
  };

  const ph = placeholder ?? t('searchPlaceholder');

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className={`relative flex items-center ${inputClassName}`}>
        {showSearchIcon && (
          <span className="pl-3 text-muted pointer-events-none shrink-0" aria-hidden="true">
            ⌕
          </span>
        )}
        <input
          id={inputId}
          type="search"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={ph}
          aria-autocomplete="list"
          aria-controls={open && suggestions.length ? listId : undefined}
          aria-expanded={open && suggestions.length > 0}
          aria-label={ariaLabel}
          aria-labelledby={labelledBy}
          className="w-full min-w-0 bg-transparent px-2 py-2.5 text-sm font-[var(--font-body)] focus:outline-none"
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-40 mt-1 w-full min-w-[12rem] rounded-xl border border-line bg-paper shadow-lg overflow-hidden ${listClassName}`}
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
