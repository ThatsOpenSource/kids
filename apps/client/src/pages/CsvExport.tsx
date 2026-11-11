import { useState, useEffect } from "react";
import { api, asArray } from "../lib/api";
import Button from "../components/Button";
import s from "../styles/page.module.css";

export default function CsvExport() {
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [klasse, setKlasse] = useState("");
  const [confirm, setConfirm] = useState("");
  const [csv, setCsv] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let c = false;
    api("/api/schools").then(d => { if (!c) setSchools(asArray(d)); }).catch(() => {});
    return () => { c = true; };
  }, []);

  async function exportCsv() {
    setErr("");
    try {
      const data = await api("/api/export/csv", { method: "POST", body: JSON.stringify({ schoolId, klasse, confirmPassword: confirm }) });
      setCsv(data.csv || "");
    } catch (e: any) { setErr(e.message); }
  }
  function download() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kids-export.csv";
    a.click();
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}><h2 className={s.title}>CSV-Export</h2></header>
      <div className={s.scroll}>
        <div className={s.row}>
          <select className="search-input" value={schoolId} onChange={e => setSchoolId(e.target.value)}>
            <option value="">Schule wählen</option>
            {schools.map(sc => <option key={sc.id} value={sc.id}>{sc.sid} – {sc.name}</option>)}
          </select>
          <input autoComplete="off" className="search-input" placeholder="Klasse (optional)" value={klasse} onChange={e => setKlasse(e.target.value)} />
          <input className="search-input" type="password" placeholder="Dein Passwort" autoComplete="off" value={confirm} onChange={e => setConfirm(e.target.value)} />
          <Button variant="primary" onClick={exportCsv}>Exportieren</Button>
          {csv && <Button onClick={download}>Download</Button>}
        </div>
        {err && <p className={s.error}>{err}</p>}
        {csv && <pre className={s.pre}>{csv.slice(0, 2000)}</pre>}
      </div>
    </div>
  );
}