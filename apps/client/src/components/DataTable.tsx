import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./DataTable.module.css";

export interface Column { key: string; label: React.ReactNode; render?: (row: any) => React.ReactNode; }
interface Props {
  columns: Column[]; rows: any[]; rowKey?: string;
  selected?: Set<string>; onSelect?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void; allSelected?: boolean; emptyText?: string;
  onSort?: (key: string, dir: "asc" | "desc" | null) => void;
  onRowClick?: (row: any) => void;
}
export default function DataTable({ columns, rows, rowKey = "id", selected, onSelect, onSelectAll, allSelected, emptyText = "Keine Einträge", onSort, onRowClick }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const showChecks = !!onSelect;

  function cycle(key: string) {
    let next: { key: string; dir: "asc" | "desc" } | null;
    if (!sort || sort.key !== key) next = { key, dir: "asc" };
    else if (sort.dir === "asc") next = { key, dir: "desc" };
    else next = null;
    setSort(next);
    onSort?.(key, next?.dir || null);
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {showChecks && <th className={styles.check}><input type="checkbox" checked={!!allSelected} onChange={e => onSelectAll?.(e.target.checked)} /></th>}
            {columns.map(c => (
              <th key={c.key} onClick={() => onSort && cycle(c.key)} style={{ cursor: onSort ? "pointer" : undefined }}>
                {c.label}{sort?.key === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={columns.length + (showChecks ? 1 : 0)} className={styles.empty}>{emptyText}</td></tr>}
          {rows.map(row => {
            const id = String(row[rowKey] ?? Math.random());
            const isSelected = selected?.has(id);
            const showBox = showChecks && (hover === id || isSelected);
            return (
              <tr key={id} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} className={isSelected ? styles.selected : ""} onClick={() => onRowClick?.(row)} style={{ cursor: onRowClick ? "pointer" : undefined }}>
                {showChecks && <td className={styles.check}>{showBox && <input type="checkbox" checked={!!isSelected} onChange={e => onSelect!(id, e.target.checked)} />}</td>}
                {columns.map(c => {
                  const v = c.render ? c.render(row) : row[c.key];
                  let display: React.ReactNode = "";
                  if (c.render) display = v;
                  else if (v == null) display = "";
                  else if (typeof v === "boolean") display = <FontAwesomeIcon icon={v ? faCheck : faXmark} />;
                  else if (Array.isArray(v)) display = v.map((x, i) => <span key={i} className={styles.chip}>{String(x)}</span>);
                  else if (typeof v === "object") display = "[…]";
                  else display = String(v);
                  return <td key={c.key} className={c.key === "actions" ? styles.actions : ""}>{display}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}