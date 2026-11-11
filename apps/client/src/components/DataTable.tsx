import { useState } from "react";

export interface Column {
  key: string;
  label: React.ReactNode;
  render?: (row: any) => React.ReactNode;
}

interface Props {
  columns: Column[];
  rows: any[];
  rowKey?: string;
  selected?: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  allSelected?: boolean;
  emptyText?: string;
}

export default function DataTable({ columns, rows, rowKey = "id", selected, onSelect, onSelectAll, allSelected, emptyText = "Keine Einträge" }: Props) {
  const [hover, setHover] = useState<string | null>(null);
  const showChecks = !!onSelect;

  return (
    <div className="table-wrap" style={{ width: "100%", overflowX: "auto" }}>
      <table className="data-table" style={{ width: "max-content", minWidth: "100%" }}>
        <thead>
          <tr>
            {showChecks && (
              <th className="col-check">
                <input type="checkbox" checked={!!allSelected} onChange={e => onSelectAll?.(e.target.checked)} />
              </th>
            )}
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + (showChecks ? 1 : 0)} style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>{emptyText}</td></tr>
          )}
          {rows.map(row => {
            const id = String(row[rowKey] ?? row.lkid ?? Math.random());
            const isSelected = selected?.has(id);
            const showBox = showChecks && (hover === id || isSelected);
            return (
              <tr key={id} onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} className={isSelected ? "row-selected" : ""}>
                {showChecks && (
                  <td className="col-check">
                    {showBox && <input type="checkbox" checked={!!isSelected} onChange={e => onSelect!(id, e.target.checked)} />}
                  </td>
                )}
                {columns.map(c => <td key={c.key} style={{ verticalAlign: "middle" }}>{c.render ? c.render(row) : (row[c.key] ?? "")}</td>)}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}