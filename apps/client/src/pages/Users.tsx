import { useState, useEffect } from "react";
import { api, asArray } from "../lib/api";
import DataTable from "../components/DataTable";
import Button from "../components/Button";
import s from "../styles/page.module.css";

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "operator" });

  const load = () => api("/api/users").then(d => setUsers(asArray(d))).catch(() => {});
  useEffect(() => { load(); }, []);

  async function create() {
    await api("/api/users", { method: "POST", body: JSON.stringify(form) });
    setOpen(false);
    setForm({ email: "", password: "", role: "operator" });
    load();
  }
  async function toggle(id: string, active: boolean) {
    await api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify({ active: !active }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Benutzer löschen?")) return;
    await api(`/api/users/${id}`, { method: "DELETE" });
    load();
  }

  const cols = [
    { key: "email", label: "E-Mail" },
    { key: "role", label: "Rolle", render: (u: any) => u.role === "admin" ? "Administrator" : u.role === "operator" ? "Bearbeiter" : "Betrachter" },
    { key: "active", label: "Aktiv", render: (u: any) => u.active ? "Ja" : "Nein" },
    { key: "mustChangePassword", label: "PW ändern", render: (u: any) => u.mustChangePassword ? "Ja" : "Nein" },
    { key: "actions", label: "", render: (u: any) => u.role === "admin" ? <span className={s.muted}>geschützt</span> : (
      <>
        <Button variant="small" onClick={() => toggle(u.id, u.active)}>{u.active ? "Deaktivieren" : "Aktivieren"}</Button>
        <Button variant="small" onClick={() => remove(u.id)}>Löschen</Button>
      </>
    ) },
  ];

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.title}>Benutzer</h2>
        <div className={s.spacer} />
        <Button variant="primary" onClick={() => setOpen(true)}>Neu</Button>
      </header>
      <div className={s.scroll}><DataTable columns={cols} rows={users} rowKey="id" /></div>
      {open && (
        <div className={s.overlay}>
          <div className={s.modal}>
            <h3>Benutzer anlegen</h3>
            <input className={"search-input " + s.field} placeholder="E-Mail" autoComplete="off" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className={"search-input " + s.field} type="password" placeholder="Passwort" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <select className={"search-input " + s.field} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="operator">Bearbeiter</option>
              <option value="admin">Administrator</option>
              <option value="viewer">Betrachter</option>
            </select>
            <Button variant="primary" onClick={create}>Anlegen</Button>
            <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}