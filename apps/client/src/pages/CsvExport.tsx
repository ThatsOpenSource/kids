import { useState, useEffect } from "react";
import { api, asArray } from "../lib/api";

export default function CsvExport() {
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [klasse, setKlasse] = useState("");
  const [confirm, setConfirm] = useState("");
  const [csv, setCsv] = useState("");

  useEffect(() => {
    api("/api/schools").then(d => setSchools(asArray(d))).catch(() => setSchools([]));
  }, []);

  async function exportCsv() {
    const data = await api("/api/export/csv", {
      method: "POST",
      body: JSON.stringify({ schoolId, klasse, includeHeaders: true, confirmPassword: confirm }),
    });
    setCsv(data.csv || "");
  }

  function download() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kids-export.csv";
    a.click();
  }

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar">
        <h2 style={{ margin: 0 }}>CSV-Export</h2>
      </header>
      <div style={{ padding: 16 }}>
        <div className="toolbar-row" style={{ marginBottom: 16 }}>
          <select className="dd-trigger" value={schoolId} onChange={e => setSchoolId(e.target.value)}>
            <option value="">Schule wählen</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.sid} – {s.name}</option>)}
          </select>
          <input className="search-input" style={{ flex: "0 0 160px" }} placeholder="Klasse (optional)" value={klasse} onChange={e => setKlasse(e.target.value)} />
          <input className="search-input" type="password" style={{ flex: "0 0 180px" }} placeholder="Dein Passwort" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <button className="btn primary" onClick={exportCsv}>Exportieren</button>
          {csv && <button className="btn" onClick={download}>Download</button>}
        </div>
        {csv && <pre style={{ background: "var(--bg-soft)", padding: 12, maxHeight: 300, overflow: "auto", whiteSpace: "pre", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>{csv.slice(0, 2000)}</pre>}
      </div>
    </div>
  );
}