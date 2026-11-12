import { useState, useEffect } from "react";
import JSZip from "jszip";
import { api, asArray } from "../lib/api";
import Button from "../components/Button";
import FilterDropdown from "../components/FilterDropdown";
import PageHeader from "../components/PageHeader";
import PageBody from "../components/PageBody";
import s from "../styles/page.module.css";

const ASM_FILES = ["locations.csv", "students.csv", "staff.csv", "classes.csv", "courses.csv", "rosters.csv"];

export default function Export() {
  const [tab, setTab] = useState<"asm" | "csv">("asm");
  const [confirm, setConfirm] = useState("");
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolIds, setSchoolIds] = useState<string[]>([]);
  const [klassen, setKlassen] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(ASM_FILES));
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api("/api/schools").then(d => setSchools(asArray(d))).catch(() => {}); }, []);

  async function runAsm() {
    if (!confirm) return;
    setBusy(true);
    const data = await api("/api/asm/export", { method: "POST", body: JSON.stringify({ confirmPassword: confirm }) });
    setResult(data);
    setBusy(false);
  }

  async function runCsv() {
    if (!confirm) return;
    setBusy(true);
    const data = await api("/api/export/csv", { method: "POST", body: JSON.stringify({ schoolIds, klassen, confirmPassword: confirm }) });
    setResult(data);
    setBusy(false);
  }

  async function download() {
    if (!result?.files) return;
    const zip = new JSZip();
    for (const [name, b64] of Object.entries(result.files as Record<string, string>)) {
      if (tab === "asm" && !selected.has(name)) continue;
      zip.file(name, atob(b64), { binary: true });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = tab === "asm" ? "asm-export.zip" : "csv-export.zip";
    a.click();
  }

  return (
    <div className={s.page}>
      <PageHeader title="Export" />
      <PageBody actions={
        <>
          <Button variant={tab === "asm" ? "primary" : "default"} onClick={() => setTab("asm")}>ASM</Button>
          <Button variant={tab === "csv" ? "primary" : "default"} onClick={() => setTab("csv")}>CSV</Button>
        </>
      }>
        <div className={s.section}>
          <input type="password" className={"search-input " + s.field} placeholder="Passwort bestätigen" autoComplete="off" value={confirm} onChange={e => setConfirm(e.target.value)} />
          {tab === "csv" && (
            <div className={s.row}>
              <FilterDropdown label="Schulen" options={schools.map(sc => ({ value: sc.id, label: sc.name }))} selected={schoolIds} onChange={setSchoolIds} />
              <FilterDropdown label="Klassen" options={[]} selected={klassen} onChange={setKlassen} />
            </div>
          )}
          {tab === "asm" && (
            <div className={s.row}>
              {ASM_FILES.map(f => (
                <label key={f} className={s.muted}><input type="checkbox" checked={selected.has(f)} onChange={() => setSelected(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n; })} /> {f}</label>
              ))}
            </div>
          )}
          <div className={s.mt}>
            <Button variant="primary" onClick={tab === "asm" ? runAsm : runCsv} disabled={busy || !confirm}>{busy ? "…" : "Exportieren"}</Button>
            {result?.files && <Button onClick={download}>Download ZIP</Button>}
          </div>
        </div>
      </PageBody>
    </div>
  );
}