import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { searchText } from '@/lib/sound-model';
export interface SoundOption { value: string; label: string; soundId?: string }
interface Props { label: string; value: string; options: SoundOption[]; disabled?: boolean; onChoose: (option: SoundOption) => void }
/** Arrow keys commit and audition immediately; no native menu Enter step. */
export function SoundSelect({ label, value, options, disabled, onChoose }: Props) {
  const [open, setOpen] = useState(false), [query, setQuery] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 320 });
  const id = useId(), root = useRef<HTMLDivElement>(null), popup = useRef<HTMLDivElement>(null);
  const chosen = options.find(option => option.value === value);
  const filtered = options.filter(option => searchText(option.label).includes(searchText(query)));
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !root.current) return;
    const rect = root.current.getBoundingClientRect(), width = Math.min(Math.max(rect.width, 320), window.innerWidth - 16);
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: window.innerHeight - rect.bottom > 300 ? rect.bottom + 4 : Math.max(8, rect.top - 290), width });
    const close = (event: Event) => { if (!popup.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener('resize', close); document.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('resize', close); document.removeEventListener('scroll', close, true); };
  }, [open]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  useEffect(() => { if (open) popup.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }); }, [open, value]);
  function choose(option: SoundOption) { onChoose(option); }
  return <div className="sound-combobox" ref={root} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (event.key === 'Tab') { setOpen(false); return; }
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) || disabled || !filtered.length) return;
    event.preventDefault(); event.stopPropagation();
    const index = filtered.findIndex(option => option.value === value);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? filtered.length - 1 : Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
    setOpen(true); choose(filtered[next]);
  }}>
    <button type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={id} aria-haspopup="listbox" aria-activedescendant={open && filtered.some(option => option.value === value) ? `${id}-${options.indexOf(chosen!)}` : undefined} disabled={disabled} className="sound-combobox-trigger" title={chosen?.label || 'Chọn sound'} onClick={event => { event.currentTarget.focus(); setQuery(''); setOpen(!open); }}>
      <span>{chosen?.label || 'Chọn sound'}</span><ChevronDown size={13} />
    </button>
    {open && createPortal(<div className="sound-combobox-popup dark" ref={popup} style={position}>
      <input className="sound-option-search" aria-label={`Tìm ${label}`} placeholder="Tìm sound… · ↑↓ nghe thử" value={query} onChange={event => setQuery(event.target.value)} />
      <div role="listbox" id={id} aria-label={label}>
        {filtered.map(option => <button type="button" role="option" id={`${id}-${options.indexOf(option)}`} key={option.value} aria-selected={option.value === value} className="sound-option" onClick={() => { choose(option); setOpen(false); root.current?.querySelector('button')?.focus(); }}><span>{option.label}</span>{option.value === value && <Check size={13} />}</button>)}
        {!filtered.length && <p className="sound-option-empty">Không tìm thấy sound</p>}
      </div>
    </div>, document.body)}
  </div>;
}
