import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Country } from '../../data/schema.ts';

interface Props {
  label: string;
  countries: Country[];
  value: string | null;
  exclude?: string | null;
  onChange: (code: string) => void;
}

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// Searchable combobox following the WAI-ARIA "list autocomplete" pattern.
export function PassportSelect({ label, countries, value, exclude, onChange }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const current = countries.find((c) => c.id === value);
  const options = useMemo(() => {
    const q = normalise(query.trim());
    return countries.filter(
      (c) =>
        c.isPassport &&
        c.id !== exclude &&
        (q === '' || normalise(c.name).includes(q) || c.id.toLowerCase() === q),
    );
  }, [countries, query, exclude]);

  const choose = (country: Country | undefined) => {
    if (!country) return;
    onChange(country.id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = (active + step + options.length) % Math.max(options.length, 1);
      setActive(next);
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className="select">
      <label htmlFor={`${id}-input`}>{label}</label>
      <input
        id={`${id}-input`}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={open && options[active] ? `${id}-option-${active}` : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={open && current ? current.name : label}
        value={open ? query : (current?.name ?? '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery('');
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul id={`${id}-list`} role="listbox" aria-label={label} className="select-list">
          {options.map((c, i) => (
            <li
              key={c.id}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={c.id === value}
              className={i === active ? 'is-active' : undefined}
              // mousedown, so the choice lands before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                choose(c);
                inputRef.current?.blur();
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{c.name}</span>
              <span className="code">{c.id}</span>
            </li>
          ))}
          {options.length === 0 && <li className="select-empty">No passport matches “{query}”</li>}
        </ul>
      )}
    </div>
  );
}
