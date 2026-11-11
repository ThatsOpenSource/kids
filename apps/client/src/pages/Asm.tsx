import { useState } from "react";
import { api } from "../lib/api";
import Button from "../components/Button";

export default function Asm() {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    const data = await api("/api/asm/export", { method: "POST", body: "{}" });
    setResult(data);
    setBusy(false);
  }

  function download(name: string, b64: string) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "text/csv;charset=windows-1252" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar">
        <h2 style={{ margin: 0 }}>ASM Export</h2>
      </header>
      <div style={{ padding: 16 }}>
        <Button variant="primary" onClick={generate} disabled={busy}>{busy ? "Generiere…" : "6 CSV-Dateien erzeugen"}</Button>
        {result?.stats && <p>Personen: {result.stats.persons} · Schüler: {result.stats.students} · Personal: {result.stats.staff} · Klassen: {result.stats.classes}</p>}
        {result?.files && Object.entries(result.files).map(([name, b64]: any) => (
          <div key={name} style={{ margin: "8px 0" }}>
            <Button onClick={() => download(name, b64)}>{name} herunterladen</Button>
          </div>
        ))}
      </div>
    </div>
  );
}