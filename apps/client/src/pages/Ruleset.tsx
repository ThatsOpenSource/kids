import { useState, useEffect } from "react";
import { api, asArray } from "../lib/api";
import Button from "../components/Button";

interface Rule {
  id?: string;
  roleId?: string;
  schoolId?: string;
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  special: boolean;
  specialSet?: string;
}

export default function Ruleset() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [form, setForm] = useState<Rule>({ length: 12, upper: true, lower: true, digits: true, special: false, specialSet: "#!?_-" });

  useEffect(() => {
    api("/api/config/roles").then(d => setRoles(asArray(d))).catch(() => {});
    api("/api/schools").then(d => setSchools(asArray(d))).catch(() => {});
  }, []);

  function add() {
    setRules(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
  }
  function remove(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar"><h2 style={{ margin: 0 }}>Passwort-Regeln</h2></header>
      <div style={{ padding: 16, overflow: "auto" }}>
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h3 style={{ margin: "0 0 12px" }}>Standardregeln</h3>
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)", fontSize: ".85rem" }}>
            <li>Grundschule-Schüler: 6-stelliges kindgerechtes Wort (100 Wörter), pro Klasse gleich, Wort nur einmal pro Klasse im Einsatz</li>
            <li>Andere Schüler: 7 alphanumerisch, eindeutig pro Klasse, 4. Zeichen ? oder !</li>
            <li>Personal: 9 Zeichen aus Buchstaben, Ziffern und #!?_-</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="filter-label">Rolle</span>
            <select className="dd-trigger" value={form.roleId || ""} onChange={e => setForm({ ...form, roleId: e.target.value || undefined })}>
              <option value="">alle</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="filter-label">Schule</span>
            <select className="dd-trigger" value={form.schoolId || ""} onChange={e => setForm({ ...form, schoolId: e.target.value || undefined })}>
              <option value="">alle</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.sid} – {s.name}</option>)}
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="filter-label">Länge</span>
            <input className="search-input" type="number" min={6} max={32} value={form.length} onChange={e => setForm({ ...form, length: +e.target.value })} style={{ width: 80 }} />
          </label>
          <label className="chip" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, upper: !form.upper })}>
            {form.upper ? "✓" : "○"} Groß
          </label>
          <label className="chip" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, lower: !form.lower })}>
            {form.lower ? "✓" : "○"} Klein
          </label>
          <label className="chip" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, digits: !form.digits })}>
            {form.digits ? "✓" : "○"} Ziffern
          </label>
          <label className="chip" style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, special: !form.special })}>
            {form.special ? "✓" : "○"} Sonder
          </label>
          <Button variant="primary" onClick={add}>Regel hinzufügen</Button>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Rolle</th><th>Schule</th><th>Länge</th><th>Zeichen</th><th></th></tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id}>
                  <td>{roles.find(x => x.id === r.roleId)?.label || "alle"}</td>
                  <td>{schools.find(x => x.id === r.schoolId)?.name || "alle"}</td>
                  <td>{r.length}</td>
                  <td>{[r.upper && "A-Z", r.lower && "a-z", r.digits && "0-9", r.special && (r.specialSet || "!@#")].filter(Boolean).join(" ")}</td>
                  <td><Button variant="small" onClick={() => remove(r.id!)}>Entfernen</Button></td>
                </tr>
              ))}
              {rules.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: 16 }}>Keine zusätzlichen Regeln</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}