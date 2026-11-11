import { useState, useRef, useEffect } from "react";

interface Option { value: string; label: string; }

interface Props {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (v: string[]) => void;
}

export default function FilterDropdown({ label, options, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const display = selected.length === 0 ? "Alle" : selected.length === 1
    ? (options.find(o => o.value === selected[0])?.label || selected[0])
    : `${selected.length} gewählt`;

  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  }

  return (
    <div className={"dd" + (open ? " open" : "")} ref={ref}>
      <button type="button" className="dd-trigger" onClick={() => setOpen(o => !o)}>
        <span className="dd-label">{label}</span>
        <span className="dd-value">{display}</span>
        <span className="dd-caret" />
      </button>
      {open && (
        <div className="dd-panel">
          <div className="dd-panel-head">
            <span>{label}</span>
            <button type="button" className="dd-clear" onClick={() => onChange([])}>Alle abwählen</button>
          </div>
          <div className="dd-options">
            {options.map(o => (
              <label key={o.value} className="dd-option">
                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}