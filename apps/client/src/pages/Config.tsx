import { useEffect, useState } from "react";
import { api, asArray } from "../lib/api";
import DataTable from "../components/DataTable";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import s from "../styles/page.module.css";

export default function Config() {
  const [roles, setRoles] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [groupFlags, setGroupFlags] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [openRole, setOpenRole] = useState(false);
  const [openFlag, setOpenFlag] = useState(false);
  const [roleForm, setRoleForm] = useState({ vceType: 411, dataId: "", label: "", aliases: "" });
  const [flagForm, setFlagForm] = useState({ dataId: "", label: "", requires: "" });
  const [gfForm, setGfForm] = useState({ flagId: "", roleId: "", schoolId: "" });

  const load = () => {
    api("/api/config/roles").then(d => setRoles(asArray(d))).catch(() => {});
    api("/api/config/flags").then(d => setFlags(asArray(d))).catch(() => {});
    api("/api/schools").then(d => setSchools(asArray(d))).catch(() => {});
    api("/api/config/group-flags").then(d => setGroupFlags(asArray(d))).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  async function saveRole() {
    await api("/api/config/roles", { method: "POST", body: JSON.stringify({ ...roleForm, aliases: roleForm.aliases.split(",").map(x => x.trim()).filter(Boolean) }) });
    setOpenRole(false); load();
  }
  async function saveFlag() {
    await api("/api/config/flags", { method: "POST", body: JSON.stringify({ ...flagForm, requires: flagForm.requires.split(",").map(x => x.trim()).filter(Boolean) }) });
    setOpenFlag(false); load();
  }
  async function assignGroup() {
    if (!gfForm.flagId) return;
    await api("/api/config/group-flags", { method: "POST", body: JSON.stringify(gfForm) });
    setGfForm({ flagId: "", roleId: "", schoolId: "" }); load();
  }

  const gfRows = groupFlags.map(g => ({ ...g, flag: g.flag?.label || "", role: roles.find(r => r.id === g.roleId)?.label || "–", school: schools.find(sc => sc.id === g.schoolId)?.name || "–" }));

  return (
    <div className={s.page}>
      <PageHeader title="Rollen & Flags" actions={<><Button variant="primary" onClick={() => setOpenRole(true)}>Rolle</Button><Button onClick={() => setOpenFlag(true)}>Flag</Button></>} />
      <div className={s.scroll}>
      <DataTable columns={[{ key: "vceType", label: "Typ-Nr." }, { key: "dataId", label: "Daten-ID" }, { key: "label", label: "Bezeichnung" }]} rows={roles} rowKey="id" />

      <h2 className={s.mt}>Flags</h2>
      <Button variant="primary" onClick={() => setOpenFlag(true)}>Flag anlegen</Button>
      <DataTable columns={[{ key: "dataId", label: "Daten-ID" }, { key: "label", label: "Bezeichnung" }, { key: "requires", label: "Voraussetzungen", render: (f: any) => (f.requires || []).join(", ") }]} rows={flags} rowKey="id" />

      <h3 className={s.mt}>Gruppen-Flags</h3>
      <p className={s.muted}>Werden dynamisch in Tabellen und Exporte eingefügt, ohne die Personen-Datensätze zu verändern.</p>
      <div className={s.row}>
        <select className="search-input" value={gfForm.flagId} onChange={e => setGfForm({ ...gfForm, flagId: e.target.value })}>
          <option value="">Flag</option>
          {flags.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select className="search-input" value={gfForm.roleId} onChange={e => setGfForm({ ...gfForm, roleId: e.target.value })}>
          <option value="">Rolle (optional)</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <select className="search-input" value={gfForm.schoolId} onChange={e => setGfForm({ ...gfForm, schoolId: e.target.value })}>
          <option value="">Schule (optional)</option>
          {schools.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
        </select>
        <Button variant="primary" onClick={assignGroup}>Zuweisen</Button>
      </div>
      <DataTable columns={[
        { key: "flag", label: "Flag" }, { key: "role", label: "Rolle" }, { key: "school", label: "Schule" },
        { key: "actions", label: "", render: (g: any) => <Button variant="small" onClick={async () => { await api(`/api/config/group-flags/${g.id}`, { method: "DELETE" }); load(); }}>Entfernen</Button> },
      ]} rows={gfRows} rowKey="id" />

      {openRole && (
        <div className={s.overlay}><div className={s.modal}>
          <h3>Rolle anlegen</h3>
          <input className={"search-input " + s.field} type="number" placeholder="vceType" value={roleForm.vceType} onChange={e => setRoleForm({ ...roleForm, vceType: +e.target.value })} />
          <input className={"search-input " + s.field} placeholder="dataId" value={roleForm.dataId} onChange={e => setRoleForm({ ...roleForm, dataId: e.target.value })} />
          <input className={"search-input " + s.field} placeholder="Bezeichnung" value={roleForm.label} onChange={e => setRoleForm({ ...roleForm, label: e.target.value })} />
          <input className={"search-input " + s.field} placeholder="Aliases (kommagetrennt)" value={roleForm.aliases} onChange={e => setRoleForm({ ...roleForm, aliases: e.target.value })} />
          <Button variant="primary" onClick={saveRole}>Speichern</Button>
          <Button onClick={() => setOpenRole(false)}>Abbrechen</Button>
        </div></div>
      )}
      {openFlag && (
        <div className={s.overlay}><div className={s.modal}>
          <h3>Flag anlegen</h3>
          <input className={"search-input " + s.field} placeholder="dataId" value={flagForm.dataId} onChange={e => setFlagForm({ ...flagForm, dataId: e.target.value })} />
          <input className={"search-input " + s.field} placeholder="Bezeichnung" value={flagForm.label} onChange={e => setFlagForm({ ...flagForm, label: e.target.value })} />
          <input className={"search-input " + s.field} placeholder="Requires (dataIds, kommagetrennt)" value={flagForm.requires} onChange={e => setFlagForm({ ...flagForm, requires: e.target.value })} />
          <Button variant="primary" onClick={saveFlag}>Speichern</Button>
          <Button onClick={() => setOpenFlag(false)}>Abbrechen</Button>
        </div></div>
      )}
      </div>
    </div>
  );
}