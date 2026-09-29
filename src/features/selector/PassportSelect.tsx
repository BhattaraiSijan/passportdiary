import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Country } from '../../data/schema.ts';

interface Props {
  label: string;
  // Shown in the empty field. Defaults to the label.
  placeholder?: string;
  countries: Country[];
  value: string | null;
  exclude?: string | null;
  onChange: (code: string) => void;
  // Shows a small button in the field that empties it.
  onClear?: () => void;
  clearLabel?: string;
}

const normalise = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

// Searchable combobox following the WAI-ARIA "list autocomplete" pattern.
export function PassportSelect({
  label,
  placeholder,
  countries,
  value,
  exclude,
  onChange,
  onClear,
  clearLabel = 'Clear passport',
}: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // -1: nothing is highlighted, so Enter cannot pick a country nobody chose.
  const [active, setActive] = useState(-1);

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

  // An untouched list highlights the current passport, or nothing at all.
  const openList = () => {
    if (open) return;
    setActive(options.findIndex((c) => c.id === value));
    setOpen(true);
  };

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
        openList();
        return;
      }
      if (options.length === 0) return;
      const next =
        e.key === 'ArrowDown'
          ? (active + 1) % options.length
          : (Math.max(active, 0) - 1 + options.length) % options.length;
      setActive(next);
      document.getElementById(`${id}-option-${next}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      if (active >= 0) choose(options[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={current && onClear ? 'select has-clear' : 'select'}>
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
        placeholder={open && current ? current.name : (placeholder ?? label)}
        value={open ? query : (current?.name ?? '')}
        onChange={(e) => {
          setQuery(e.target.value);
          // Typing highlights the best match; an emptied field highlights nothing.
          setActive(e.target.value.trim() === '' ? -1 : 0);
          setOpen(true);
        }}
        onFocus={openList}
        // The field keeps focus after a choice, so a click has to open the list too.
        onClick={openList}
        onBlur={() => {
          setOpen(false);
          setQuery('');
        }}
        onKeyDown={onKeyDown}
      />
      {current && onClear && !open && (
        <button type="button" className="select-clear" aria-label={clearLabel} onClick={onClear}>
          <span aria-hidden="true">×</span>
        </button>
      )}
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
