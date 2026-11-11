import { useState } from "react";
import JSZip from "jszip";
import { api } from "../lib/api";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import s from "../styles/page.module.css";

const ALL_FILES = ["locations.csv", "students.csv", "staff.csv", "classes.csv", "courses.csv", "rosters.csv"];

export default function Asm() {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(ALL_FILES));

  async function generate() {
    setBusy(true);
    const data = await api("/api/asm/export", { method: "POST", body: "{}" });
    setResult(data);
    setSelected(new Set(ALL_FILES));
    setBusy(false);
  }
  function toggle(name: string) {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }
  async function downloadZip() {
    if (!result?.files) return;
    const zip = new JSZip();
    for (const name of selected) {
      const b64 = result.files[name];
      if (!b64) continue;
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      zip.file(name, bytes);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "asm-export.zip";
    a.click();
  }

  return (
    <div className={s.page}>
      <PageHeader title="ASM Export" actions={<Button variant="primary" onClick={generate} disabled={busy}>{busy ? "…" : "CSV erzeugen"}</Button>} />
      <div className={s.scroll}>
      {result?.stats && <p>Schüler: {result.stats.students} · Personal: {result.stats.staff} · Klassen: {result.stats.classes}</p>}
      {result?.files && (
        <div className={s.mt}>
          <h3>Dateien (UTF-8)</h3>
          {ALL_FILES.map(name => (
            <label key={name} className={s.mb}>
              <input type="checkbox" checked={selected.has(name)} onChange={() => toggle(name)} /> {name}
            </label>
          ))}
          <Button variant="primary" onClick={downloadZip} disabled={selected.size === 0}>ZIP herunterladen ({selected.size})</Button>
        </div>
      )}
      </div>
    </div>
  );
}