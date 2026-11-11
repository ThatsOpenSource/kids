import { useEffect, useState } from "react";
import { api, asArray } from "../lib/api";
import { ErrorBox } from "../components/ErrorBox";
import Button from "../components/Button";
import DataTable from "../components/DataTable";

export default function Config() {
  const [roles, setRoles] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [groupFlags, setGroupFlags] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [gfForm, setGfForm] = useState({ flagId: "", roleId: "", schoolId: "" });
  const [openRole, setOpenRole] = useState(false);
  const [openFlag, setOpenFlag] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [editFlagId, setEditFlagId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({ vceType: 411, dataId: "", label: "", aliases: "" });
  const [flagForm, setFlagForm] = useState({ dataId: "", label: "", requires: "" });
  const [error, setError] = useState<any>(null);

  const load = () => {
    api("/api/config/roles").then(d => setRoles(asArray(d))).catch(() => setRoles([]));
    api("/api/config/flags").then(d => setFlags(asArray(d))).catch(() => setFlags([]));
    api("/api/config/group-flags").then(d => setGroupFlags(asArray(d))).catch(() => setGroupFlags([]));
    api("/api/schools").then(d => setSchools(asArray(d))).catch(() => setSchools([]));
  };
  useEffect(() => { load(); }, []);

  function openRoleCreate() { setEditRoleId(null); setRoleForm({ vceType: 411, dataId: "", label: "", aliases: "" }); setOpenRole(true); }
  function openRoleEdit(r: any) { setEditRoleId(r.id); setRoleForm({ vceType: r.vceType, dataId: r.dataId, label: r.label, aliases: (r.aliases || []).join(", ") }); setOpenRole(true); }
  function openFlagCreate() { setEditFlagId(null); setFlagForm({ dataId: "", label: "", requires: "" }); setOpenFlag(true); }
  function openFlagEdit(f: any) { setEditFlagId(f.id); setFlagForm({ dataId: f.dataId, label: f.label, requires: (f.requires || []).join(", ") }); setOpenFlag(true); }

  async function saveRole() {
    setError(null);
    try {
      const body = { ...roleForm, aliases: roleForm.aliases.split(",").map(s => s.trim()).filter(Boolean) };
      const method = editRoleId ? "PUT" : "POST";
      const url = editRoleId ? `/api/config/roles/${editRoleId}` : "/api/config/roles";
      await api(url, { method, body: JSON.stringify(body) });
      setOpenRole(false); load();
    } catch (e: any) {
      setError(e.raw || { error: e.message, code: e.code, requestId: e.requestId, details: e.details });
    }
  }

  async function saveFlag() {
    const body = { ...flagForm, requires: flagForm.requires.split(",").map(s => s.trim()).filter(Boolean) };
    const method = editFlagId ? "PUT" : "POST";
    const url = editFlagId ? `/api/config/flags/${editFlagId}` : "/api/config/flags";
    await api(url, { method, body: JSON.stringify(body) });
    setOpenFlag(false); load();
  }

  const roleCols = [
    { key: "vceType", label: "Typ-Nr." },
    { key: "dataId", label: "Daten-ID" },
    { key: "label", label: "Bezeichnung" },
    { key: "aliases", label: "Aliase", render: (r: any) => (r.aliases || []).join(", ") },
    { key: "actions", label: "", render: (r: any) => <Button variant="small" onClick={() => openRoleEdit(r)}>Bearbeiten</Button> },
  ];
  const flagCols = [
    { key: "dataId", label: "Daten-ID" },
    { key: "label", label: "Bezeichnung" },
    { key: "requires", label: "Voraussetzungen", render: (f: any) => (f.requires || []).join(", ") },
    { key: "actions", label: "", render: (f: any) => <Button variant="small" onClick={() => openFlagEdit(f)}>Bearbeiten</Button> },
  ];

  return (
    <div className="tab-panel active" style={{ display: "flex", overflow: "auto" }}>
      <header className="toolbar"><h2 style={{ margin: 0 }}>Rollen & Flags</h2></header>
      <ErrorBox error={error} />
      <div style={{ padding: 16 }}>
        <h3>Rollen</h3>
        <Button variant="primary" onClick={openRoleCreate}>Rolle anlegen</Button>
        {openRole && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)", width: 420, border: "1px solid var(--border)" }}>
              <h3>{editRoleId ? "Rolle bearbeiten" : "Neue Rolle"}</h3>
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} type="number" placeholder="vceType" value={roleForm.vceType} onChange={e => setRoleForm({ ...roleForm, vceType: +e.target.value })} />
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="dataId" value={roleForm.dataId} onChange={e => setRoleForm({ ...roleForm, dataId: e.target.value })} />
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="Anzeigename" value={roleForm.label} onChange={e => setRoleForm({ ...roleForm, label: e.target.value })} />
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="Aliases (kommagetrennt)" value={roleForm.aliases} onChange={e => setRoleForm({ ...roleForm, aliases: e.target.value })} />
              <Button variant="primary" onClick={saveRole}>Speichern</Button>
              <Button style={{ marginLeft: 8 }} onClick={() => setOpenRole(false)}>Abbrechen</Button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}><DataTable columns={roleCols} rows={roles} rowKey="id" /></div>

        <h3 style={{ marginTop: 32 }}>Flags</h3>
        <Button variant="primary" onClick={openFlagCreate}>Flag anlegen</Button>
        {openFlag && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
            <div style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)", width: 420, border: "1px solid var(--border)" }}>
              <h3>{editFlagId ? "Flag bearbeiten" : "Neuer Flag"}</h3>
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="dataId" value={flagForm.dataId} onChange={e => setFlagForm({ ...flagForm, dataId: e.target.value })} />
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="Label" value={flagForm.label} onChange={e => setFlagForm({ ...flagForm, label: e.target.value })} />
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="Requires (dataIds, kommagetrennt)" value={flagForm.requires} onChange={e => setFlagForm({ ...flagForm, requires: e.target.value })} />
              <Button variant="primary" onClick={saveFlag}>Speichern</Button>
              <Button style={{ marginLeft: 8 }} onClick={() => setOpenFlag(false)}>Abbrechen</Button>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12 }}><DataTable columns={flagCols} rows={flags} rowKey="id" /></div>

        <h3 style={{ marginTop: 32 }}>Gruppen-Flags</h3>
        <p style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>Werden dynamisch in Tabellen und Exporte eingefügt, ohne die Personen-Datensätze zu verändern.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "flex-end" }}>
          <select className="dd-trigger" value={gfForm.flagId} onChange={e => setGfForm({ ...gfForm, flagId: e.target.value })}>
            <option value="">Flag</option>
            {flags.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <select className="dd-trigger" value={gfForm.roleId} onChange={e => setGfForm({ ...gfForm, roleId: e.target.value })}>
            <option value="">Rolle (optional)</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <select className="dd-trigger" value={gfForm.schoolId} onChange={e => setGfForm({ ...gfForm, schoolId: e.target.value })}>
            <option value="">Schule (optional)</option>
            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button variant="primary" onClick={async () => {
            if (!gfForm.flagId) return;
            await api("/api/config/group-flags", { method: "POST", body: JSON.stringify(gfForm) });
            setGfForm({ flagId: "", roleId: "", schoolId: "" });
            load();
          }}>Zuweisen</Button>
        </div>
        <DataTable
          columns={[
            { key: "flag", label: "Flag" },
            { key: "role", label: "Rolle" },
            { key: "school", label: "Schule" },
            { key: "actions", label: "", render: (g: any) => <Button variant="small" onClick={async () => { await api(`/api/config/group-flags/${g.id}`, { method: "DELETE" }); load(); }}>Entfernen</Button> },
          ]}
          rows={groupFlags}
          rowKey="id"
        />
      </div>
    </div>
  );
}