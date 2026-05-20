'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface DropdownOption<T extends string> {
  value: T;
  /** Compact label shown in the trigger (e.g. "EN", "ISK"). */
  short: string;
  /** Full label shown in the menu row. */
  label: string;
  /** Trailing mono hint (code / symbol). */
  hint?: string;
}

interface HeaderDropdownProps<T extends string> {
  ariaLabel: string;
  value: T;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  leadingIcon?: ReactNode;
}

/**
 * On-brand header dropdown for Language / Currency. Anchors to the trigger,
 * opens on click, closes on outside-click / Escape. Keyboard navigable.
 * Styling inherits the dark/light header state via `.ed-header.is-*`.
 */
export function HeaderDropdown<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  leadingIcon,
}: HeaderDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => {
      const first =
        menuRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
        menuRef.current?.querySelector<HTMLElement>('[role="option"]');
      first?.focus();
    }, 0);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
      window.clearTimeout(id);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className={`ed-dd${open ? ' is-open' : ''}`} ref={wrapRef}>
      <button
        type="button"
        className="ed-dd-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {leadingIcon}
        <span className="ed-dd-value">{current.short}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <ul className="ed-dd-menu" role="listbox" aria-label={ariaLabel} ref={menuRef}>
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                className={`ed-dd-item${selected ? ' is-selected' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
              >
                <span className="ed-dd-label">{opt.label}</span>
                {opt.hint && <span className="ed-dd-hint">{opt.hint}</span>}
                {selected && <Check size={14} aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
