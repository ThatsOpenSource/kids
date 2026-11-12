import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { api } from "../lib/api";
import DataTable from "../components/DataTable";
import { PERSON_COLUMNS } from "../lib/columns";
import Button from "../components/Button";
import s from "../styles/page.module.css";

interface FileEntry { name: string; type: string; xml: string; }

export default function Import() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [result, setResult] = useState<any>(null);
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [changePage, setChangePage] = useState(0);
  const [editRow, setEditRow] = useState<any>(null);

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    setBusy(true);
    const entries: FileEntry[] = [];
    for (const file of Array.from(fileList)) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(file);
        for (const n of Object.keys(zip.files).filter(x => x.endsWith(".xml") && !zip.files[x].dir)) {
          const xml = await zip.files[n].async("string");
          entries.push({ name: n, type: /lul/i.test(n) ? "LuL" : "SuS", xml });
        }
      } else if (file.name.endsWith(".xml")) {
        entries.push({ name: file.name, type: /lul/i.test(file.name) ? "LuL" : "SuS", xml: await file.text() });
      }
    }
    setFiles(entries);
    setBusy(false);
    if (entries.length) {
      const payload = { files: entries.map(f => ({ name: f.name, type: f.type, xmlBase64: btoa(unescape(encodeURIComponent(f.xml))) })) };
      const data = await api("/api/import/preview", { method: "POST", body: JSON.stringify(payload) });
      setResult(data);
      setSelected(new Set(data.preview.map((p: any) => p.lkid)));
    }
  }, []);

  async function commit() {
    setBusy(true);
    const payload = {
      files: files.map(f => ({ name: f.name, type: f.type, xmlBase64: btoa(unescape(encodeURIComponent(f.xml))) })),
      selectedLkids: [...selected],
    };
    const data = await api("/api/import/commit", { method: "POST", body: JSON.stringify(payload) });
    if (data.created || data.updated) nav("/personen");
    setBusy(false);
  }

  const changes = result?.changes || [];
  const pageSize = 10;
  const changePages = Math.ceil(changes.length / pageSize);
  const visibleChanges = changes.slice(changePage * pageSize, (changePage + 1) * pageSize);

  return (
    <div className={s.page}>
      <header className={s.toolbar}><h2 className={s.title}>Import</h2></header>
      <div className={s.scroll}>
        <div className={s.dropzone} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files); }}>
          <p>SuS- und LuL-Dateien hier ablegen</p>
          <label className="btn primary">
            Dateien auswählen
            <input type="file" multiple accept=".zip,.xml" className={s.hidden} onChange={e => e.target.files && processFiles(e.target.files)} />
          </label>
        </div>
        {files.length > 0 && <DataTable columns={[{ key: "name", label: "Datei" }, { key: "type", label: "Typ" }]} rows={files} rowKey="name" />}
        {result?.preview && (
          <>
            <h3 className={s.mt}>Änderungen ({changes.length})</h3>
            {changes.length === 0 && <p className={s.muted}>Keine Abweichungen.</p>}
            {visibleChanges.length > 0 && (
              <table className={s.mb}>
                <thead><tr><th></th><th>LKID</th><th>Feld</th><th>Bisher</th><th>Neu</th><th></th></tr></thead>
                <tbody>
                  {visibleChanges.map((c: any, i: number) => (
                    <tr key={i}>
                      <td><input type="checkbox" checked={selected.has(c.lkid)} onChange={e => { const n = new Set(selected); e.target.checked ? n.add(c.lkid) : n.delete(c.lkid); setSelected(n); }} /></td>
                      <td>{c.lkid}</td><td>{c.field}</td>
                      <td className={s.old}>{c.old}</td>
                      <td className={s.new}>{c.new}</td>
                      <td><Button variant="small" onClick={() => setEditRow(c)}>Edit</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {changePages > 1 && (
              <div className={s.row}>
                <Button variant="small" disabled={changePage <= 0} onClick={() => setChangePage(p => p - 1)}>Zurück</Button>
                <span>Seite {changePage + 1} von {changePages}</span>
                <Button variant="small" disabled={changePage >= changePages - 1} onClick={() => setChangePage(p => p + 1)}>Weiter</Button>
              </div>
            )}
            <DataTable columns={PERSON_COLUMNS} rows={result.preview} rowKey="lkid" />
            {result?.unchanged && <p className={s.muted}>{result.message}</p>}
            <Button variant="primary" onClick={commit} disabled={busy || result?.unchanged}>Importieren ({selected.size})</Button>
          </>
        )}
        {result?.committed && <p>Erstellt: {result.committed.created} · Aktualisiert: {result.committed.updated}</p>}
      </div>
      {editRow && (
        <div className={s.overlay}><div className={s.modal}>
          <h3>Änderung bearbeiten</h3>
          <p>{editRow.lkid} · {editRow.field}</p>
          <input className={"search-input " + s.field} value={editRow.new} onChange={e => setEditRow({ ...editRow, new: e.target.value })} />
          <Button variant="primary" onClick={() => { setResult({ ...result, changes: changes.map((c: any) => c === editRow ? editRow : c) }); setEditRow(null); }}>OK</Button>
          <Button onClick={() => setEditRow(null)}>Abbrechen</Button>
        </div></div>
      )}
    </div>
  );
}