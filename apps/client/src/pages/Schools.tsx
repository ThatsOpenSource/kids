import { useEffect, useState } from "react";
import { api, asArray } from "../lib/api";
import Button from "../components/Button";
import DataTable from "../components/DataTable";

export default function Schools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    sid: "", sgid: "", name: "",
    config: { mdmEmailDomain: "schulen-greiz.de", mdmEmailPattern: "{username}@{soid}.{domain}", umlautMode: "ae", passwordPolicy: { length: 12, upper: true, lower: true, digits: true, special: false, wordCount: 0 } },
  });

  const load = () => api("/api/schools").then(d => setSchools(asArray(d))).catch(() => setSchools([]));
  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditId(null);
    setForm({ sid: "", sgid: "", name: "", config: { mdmEmailDomain: "schulen-greiz.de", mdmEmailPattern: "{username}@{soid}.{domain}", umlautMode: "ae", passwordPolicy: { length: 12, upper: true, lower: true, digits: true, special: false, wordCount: 0 } } });
    setOpen(true);
  }
  function openEdit(s: any) {
    setEditId(s.id);
    setForm({ sid: s.sid, sgid: s.sgid, name: s.name, config: s.config || {} });
    setOpen(true);
  }
  async function save() {
    const method = editId ? "PUT" : "POST";
    const url = editId ? `/api/schools/${editId}` : "/api/schools";
    await api(url, { method, body: JSON.stringify(form) });
    setOpen(false);
    load();
  }
  async function importCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const csv = await file.text();
    await api("/api/schools/import-csv", { method: "POST", body: JSON.stringify({ csv }) });
    load();
  }

  const cols = [
    { key: "sid", label: "SID" },
    { key: "soid", label: "SOID" },
    { key: "sgid", label: "SGID" },
    { key: "schoolType", label: "Typ" },
    { key: "name", label: "Name" },
    { key: "actions", label: "", render: (s: any) => <Button variant="small" onClick={() => openEdit(s)}>Bearbeiten</Button> },
  ];

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar">
        <h2 style={{ margin: 0 }}>Schulen</h2>
        <span className="toolbar-spacer" />
        <Button variant="primary" onClick={openCreate}>Neue Schule</Button>
        <label className="btn" style={{ cursor: "pointer" }}>
          CSV importieren
          <input type="file" accept=".csv" onChange={importCsv} style={{ display: "none" }} />
        </label>
      </header>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)", width: 480, maxHeight: "90vh", overflow: "auto", border: "1px solid var(--border)" }}>
            <h3>{editId ? "Schule bearbeiten" : "Schule anlegen"}</h3>
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="SID (5-stellig)" value={form.sid} onChange={e => setForm({ ...form, sid: e.target.value })} disabled={!!editId} />
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="SGID" value={form.sgid} onChange={e => setForm({ ...form, sgid: e.target.value })} />
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <h4>MDM / System-E-Mail</h4>
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="mdmEmailDomain" value={form.config.mdmEmailDomain || ""} onChange={e => setForm({ ...form, config: { ...form.config, mdmEmailDomain: e.target.value } })} />
            <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="mdmEmailPattern" value={form.config.mdmEmailPattern || ""} onChange={e => setForm({ ...form, config: { ...form.config, mdmEmailPattern: e.target.value } })} />
            <Button variant="primary" onClick={save}>Speichern</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => setOpen(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      <div className="table-area" style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <DataTable columns={cols} rows={schools} rowKey="id" />
      </div>
    </div>
  );
}