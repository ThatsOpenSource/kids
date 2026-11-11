import { useState, useCallback } from "react";
import JSZip from "jszip";
import { api } from "../lib/api";
import DataTable, { Column } from "../components/DataTable";
import { ErrorBox } from "../components/ErrorBox";
import Button from "../components/Button";

interface FileEntry { name: string; type: "SuS" | "LuL" | "unknown"; xml: string; }
interface MissingSchool { snr: string; name?: string; files: string[]; }

const PREVIEW_COLS: Column[] = [
  { key: "sid", label: "SID" },
  { key: "sgid", label: "SGID" },
  { key: "soid", label: "SOID" },
  { key: "schoolName", label: "Schulname" },
  { key: "schoolType", label: "Schultyp" },
  { key: "klasse", label: "Klasse" },
  { key: "stufe", label: "Stufe" },
  { key: "lkid", label: "LKID" },
  { key: "name", label: "Name" },
  { key: "firstName", label: "Vorname" },
  { key: "dateOfBirth", label: "Geburt" },
  { key: "username", label: "Benutzername" },
  { key: "appleId", label: "Apple ID" },
  { key: "email", label: "persön. E-Mail" },
  { key: "systemEmail", label: "System-E-Mail" },
  { key: "flags", label: "Flags", render: (r) => (r.flags || []).map((f: string) => <span key={f} className="chip chip-flag">{f}</span>) },
  { key: "status", label: "Status", render: (r) => r.issues?.length
    ? <span className="issue-btn issue-error" title={r.issues.join(", ")}>!</span>
    : <span className="issue-ok-dot" /> },
];

export default function Import() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<any>(null);
  const [missing, setMissing] = useState<MissingSchool | null>(null);
  const [schoolForm, setSchoolForm] = useState({ sid: "", sgid: "", name: "" });

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    setBusy(true); setResult(null); setError(null);
    const entries: FileEntry[] = [];
    for (const file of Array.from(fileList)) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        const xmlNames = Object.keys(zip.files).filter(n => n.toLowerCase().endsWith(".xml") && !zip.files[n].dir);
        for (const n of xmlNames) {
          const xml = await zip.files[n].async("string");
          const type: FileEntry["type"] = /lul/i.test(n) || /lul/i.test(file.name) ? "LuL" : /sus/i.test(n) || /sus/i.test(file.name) ? "SuS" : "unknown";
          entries.push({ name: n, type, xml });
        }
      } else if (file.name.toLowerCase().endsWith(".xml")) {
        const xml = await file.text();
        const type: FileEntry["type"] = /lul/i.test(file.name) ? "LuL" : /sus/i.test(file.name) ? "SuS" : "unknown";
        entries.push({ name: file.name, type, xml });
      }
    }
    setFiles(entries);
    setBusy(false);
    if (entries.length) {
      const payload = { files: entries.map(f => ({ name: f.name, type: f.type, xmlBase64: btoa(unescape(encodeURIComponent(f.xml))) })) };
      try {
        const data = await api("/api/import/preview", { method: "POST", body: JSON.stringify(payload) });
        setResult(data);
        if (data.missingSchools?.length) {
          const m = data.missingSchools[0];
          setMissing(m);
          setSchoolForm({ sid: "", sgid: m.snr, name: m.name || "" });
        }
      } catch (e: any) {
        setError(e.raw || { error: e.message });
      }
    }
  }, []);

  function payload() {
    return {
      files: files.map(f => ({
        name: f.name,
        type: f.type,
        xmlBase64: btoa(unescape(encodeURIComponent(f.xml))),
      })),
    };
  }

  async function preview() {
    if (!files.length) return;
    setBusy(true); setError(null);
    try {
      const data = await api("/api/import/preview", { method: "POST", body: JSON.stringify(payload()) });
      setResult(data);
      if (data.missingSchools?.length) {
        const m = data.missingSchools[0];
        setMissing(m);
        setSchoolForm({ sid: "", sgid: m.snr, name: m.name || "" });
      }
    } catch (e: any) {
      setError(e.raw || { error: e.message });
    }
    setBusy(false);
  }

  async function createSchool() {
    if (!missing) return;
    setBusy(true);
    try {
      await api("/api/schools", { method: "POST", body: JSON.stringify(schoolForm) });
      setMissing(null);
      await preview();
    } catch (e: any) {
      setError(e.raw || { error: e.message });
    }
    setBusy(false);
  }

  async function commit() {
    if (!files.length) return;
    setBusy(true); setError(null);
    try {
      const data = await api("/api/import/commit", { method: "POST", body: JSON.stringify(payload()) });
      setResult(data);
    } catch (e: any) {
      setError(e.raw || { error: e.message });
    }
    setBusy(false);
  }

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar">
        <h2 style={{ margin: 0 }}>Import</h2>
      </header>
      <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); }}
          style={{
            border: `2px dashed ${drag ? "var(--primary)" : "var(--border-strong)"}`,
            borderRadius: "var(--radius)", padding: 40, textAlign: "center",
            background: drag ? "var(--bg-soft)" : "var(--bg)", marginBottom: 16,
          }}
        >
          <p style={{ margin: "0 0 12px", color: "var(--text-muted)" }}>SuS- und LuL-Dateien hier ablegen (ZIP oder XML)</p>
          <label className="btn primary" style={{ cursor: "pointer" }}>
            Dateien auswählen
            <input type="file" multiple accept=".zip,.xml" style={{ display: "none" }} onChange={e => e.target.files && processFiles(e.target.files)} disabled={busy} />
          </label>
        </div>

        <ErrorBox error={error} />

        {files.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <DataTable columns={[{ key: "name", label: "Datei" }, { key: "type", label: "Typ" }]} rows={files} rowKey="name" />
            <div style={{ marginTop: 12 }}>
              <Button variant="primary" onClick={preview} disabled={busy}>Vorschau</Button>
              {result && result.issuesCount === 0 && !missing && (
                <Button style={{ marginLeft: 8 }} onClick={commit} disabled={busy}>Importieren</Button>
              )}
            </div>
          </div>
        )}

        {busy && <p>Wird verarbeitet…</p>}

        {result?.preview && (
          <div style={{ marginTop: 16 }}>
            <h3>{result.message}</h3>
            <div style={{ marginBottom: 16, padding: 12, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--bg-soft)" }}>
              <strong>Änderungen</strong>
              {result.changes?.length > 0 ? (
                <table className="data-table" style={{ marginTop: 8 }}>
                  <thead><tr><th>LKID</th><th>Feld</th><th>Bisher</th><th>Neu</th></tr></thead>
                  <tbody>
                    {result.changes.map((c: any, i: number) => (
                      <tr key={i}>
                        <td>{c.lkid}</td>
                        <td>{c.field}</td>
                        <td style={{ background: "#fff5f5" }}>{c.old || "–"}</td>
                        <td style={{ background: "#f0fff4" }}>{c.new || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>Keine Abweichungen zu vorhandenen Einträgen.</p>
              )}
            </div>
            <DataTable columns={PREVIEW_COLS} rows={result.preview} rowKey="lkid" />
          </div>
        )}

        {result?.created !== undefined && (
          <p style={{ marginTop: 12 }}>Erstellt: {result.created} · Aktualisiert: {result.updated} · Unverändert: {result.skipped}</p>
        )}
      </div>

      {missing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)", width: 440, border: "1px solid var(--border)" }}>
            <h3>Schule nicht vorhanden</h3>
            <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>SNR {missing.snr} wurde in den Dateien gefunden, ist aber noch nicht angelegt.</p>
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="SID (5-stellig, z.B. 23045)" value={schoolForm.sid} onChange={e => setSchoolForm({ ...schoolForm, sid: e.target.value })} />
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="SGID / Schulnummer" value={schoolForm.sgid} onChange={e => setSchoolForm({ ...schoolForm, sgid: e.target.value })} />
            <input className="search-input" style={{ width: "100%", marginBottom: 12 }} placeholder="Name" value={schoolForm.name} onChange={e => setSchoolForm({ ...schoolForm, name: e.target.value })} />
            <Button variant="primary" onClick={createSchool} disabled={!schoolForm.sid || schoolForm.sid.length !== 5}>Anlegen und fortfahren</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => setMissing(null)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}