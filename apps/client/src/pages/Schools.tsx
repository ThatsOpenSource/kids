import { useState, useEffect, useRef } from "react";
import { api, asArray } from "../lib/api";
import DataTable from "../components/DataTable";
import Button from "../components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash, faPlus, faFileImport, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import PageHeader from "../components/PageHeader";
import s from "../styles/page.module.css";

export default function Schools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ sid: "", sgid: "", name: "" });
  const [typeConfigs, setTypeConfigs] = useState<any[]>([]);
  const [tcForm, setTcForm] = useState({ prefix: "", label: "" });
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    api("/api/schools").then(d => setSchools(asArray(d))).catch(() => {});
    api("/api/schools/type-configs").then(d => setTypeConfigs(asArray(d))).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  function openCreate() { setEditId(null); setForm({ sid: "", sgid: "", name: "" }); setOpen(true); }
  function openEdit(s: any) { setEditId(s.id); setForm({ sid: s.sid, sgid: s.sgid, name: s.name }); setOpen(true); }

  async function save() {
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/schools/${editId}` : "/api/schools";
    await api(url, { method, body: JSON.stringify(form) });
    setOpen(false);
    load();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const csv = await file.text();
    setCsvText(csv);
    const result = await api("/api/schools/import-preview", { method: "POST", body: JSON.stringify({ csv }) });
    setPreview(result);
    setSelected(new Set(asArray(result.preview).map((r: any) => r.sid)));
  }

  async function commit() {
    await api("/api/schools/import-csv", { method: "POST", body: JSON.stringify({ csv: csvText, selected: [...selected] }) });
    setPreview(null);
    setCsvText("");
    load();
  }

  const cols = [
    { key: "sid", label: "SID" },
    { key: "sgid", label: "SGID" },
    { key: "soid", label: "SOID" },
    { key: "type", label: "Typ", render: (s: any) => s.type?.label || "" },
    { key: "name", label: "Name" },
    { key: "actions", label: "", render: (s: any) => <Button variant="small" onClick={() => openEdit(s)}><FontAwesomeIcon icon={faPen} /></Button> },
  ];

  const previewCols = [
    { key: "sid", label: "SID" },
    { key: "sgid", label: "SGID" },
    { key: "soid", label: "SOID" },
    { key: "schoolType", label: "Typ" },
    { key: "name", label: "Name" },
  ];

  return (
    <div className={s.page}>
      <PageHeader title="Schulen" actions={
        <>
          <Button variant="primary" onClick={openCreate}><FontAwesomeIcon icon={faPlus} /> Neue Schule</Button>
          <Button onClick={() => fileRef.current?.click()}><FontAwesomeIcon icon={faFileImport} /> CSV importieren</Button>
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} style={{ display: "none" }} />
        </>
      } />
      <div className={s.scroll}><DataTable columns={cols} rows={schools} rowKey="id" /></div>
      <div className={s.section}>
        <h3>Schultypen</h3>
        <p className={s.muted}>Prefix (erste 2 Ziffern der SID) → Typ. Zeilen ohne passenden Prefix werden abgelehnt.</p>
        <div className={s.row}>
          <input autoComplete="off" className="search-input" placeholder="Prefix" value={tcForm.prefix} onChange={e => setTcForm({ ...tcForm, prefix: e.target.value })} />
          <input autoComplete="off" className="search-input" placeholder="Bezeichnung" value={tcForm.label} onChange={e => setTcForm({ ...tcForm, label: e.target.value })} />
          <Button onClick={async () => { await api("/api/schools/type-configs", { method: "POST", body: JSON.stringify(tcForm) }); setTcForm({ prefix: "", label: "" }); load(); }}>Hinzufügen</Button>
        </div>
        {typeConfigs.length > 0 && (
          <DataTable columns={[{ key: "prefix", label: "Prefix (SOID)" }, { key: "label", label: "Typ" }, { key: "actions", label: "", render: (t: any) => <Button variant="small" onClick={async () => { await api(`/api/schools/type-configs/${t.prefix}`, { method: "DELETE" }); load(); }}>Entfernen</Button> }]} rows={typeConfigs} rowKey="prefix" emptyText="Keine Typen konfiguriert" />
        )}
      </div>

      {preview && (
        <div className={s.overlay}><div className={s.modal + " " + s.modalWide}>
          <h3>Import-Vorschau · {asArray(preview.preview).length} Schulen · {preview.newCount} neu</h3>
          <DataTable columns={previewCols} rows={asArray(preview.preview)} rowKey="sid" selected={selected} onSelect={(id, c) => setSelected(prev => { const n = new Set(prev); c ? n.add(id) : n.delete(id); return n; })} />
          {asArray(preview.rejected).length > 0 && (
            <div className={s.mt}>
              <h4>Abgelehnt ({asArray(preview.rejected).length})</h4>
              {asArray(preview.rejected).slice(0, 10).map((r: any, i: number) => <p key={i} className={s.muted}>{r.sid || r.line} — {r.reason}</p>)}
              {asArray(preview.rejected).length > 10 && <p className={s.muted}>… und {asArray(preview.rejected).length - 10} weitere</p>}
            </div>
          )}
          <div className={s.mt}>
            <Button variant="primary" onClick={commit}>Importieren ({selected.size})</Button>
            <Button onClick={() => setPreview(null)}>Abbrechen</Button>
          </div>
        </div></div>
      )}

      {open && (
        <div className={s.overlay}><div className={s.modal}>
          <h3>{editId ? "Schule bearbeiten" : "Neue Schule"}</h3>
          <input className={"search-input " + s.field} placeholder="SID" value={form.sid} onChange={e => setForm({ ...form, sid: e.target.value })} />
          <input className={"search-input " + s.field} placeholder="SGID" value={form.sgid} onChange={e => setForm({ ...form, sgid: e.target.value })} />
          <input className={"search-input " + s.field} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Button variant="primary" onClick={save}>Speichern</Button>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
        </div></div>
      )}
    </div>
  );
}