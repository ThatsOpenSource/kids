import { useEffect, useState } from "react";
import { api, asArray } from "../lib/api";
import DataTable from "../components/DataTable";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import s from "../styles/page.module.css";

const TYPE_LABELS: Record<string, string> = { person: "Person", school: "Schule", role: "Rolle", flag: "Flag", user: "Benutzer", import: "Import", groupFlag: "Gruppen-Flag", class: "Klasse" };
const ACTION_LABELS: Record<string, string> = { create: "Angelegt", update: "Geändert", delete: "Gelöscht", login: "Anmeldung", "password-change": "Passwort geändert", "password-reset": "Passwort zurückgesetzt", "password-set": "Passwort gesetzt", "password-generate": "Passwort erzeugt", "password-reveal": "Passwort angezeigt", "2fa-enabled": "2FA aktiviert", commit: "Import durchgeführt", deactivate: "Deaktiviert", "class-change": "Klassenwechsel", "school-change": "Schulwechsel", "name-change": "Namensänderung" };

function formatDetails(d: any): string {
  if (!d || typeof d !== "object") return "";
  const parts: string[] = [];
  if (d.email) parts.push(`E-Mail: ${d.email}`);
  if (d.fields) parts.push(`Felder: ${d.fields.join(", ")}`);
  if (d.sid) parts.push(`SID: ${d.sid}`);
  if (d.name) parts.push(`Name: ${d.name}`);
  if (d.dataId) parts.push(`Daten-ID: ${d.dataId}`);
  if (d.created !== undefined) parts.push(`Erstellt: ${d.created}, Aktualisiert: ${d.updated}`);
  if (d.active !== undefined) parts.push(`Aktiv: ${d.active ? "Ja" : "Nein"}`);
  if (d.role) parts.push(`Rolle: ${d.role}`);
  if (d.old) parts.push(`Alt: ${d.old}`);
  if (d.new) parts.push(`Neu: ${d.new}`);
  return parts.join(" · ") || "";
}

export function HistoryDialog({ entityType, entityId, onClose }: { entityType: string; entityId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    api(`/api/history?entityType=${entityType}&entityId=${entityId}&limit=20`).then(d => setLogs(asArray(d.logs))).catch(() => {});
  }, [entityType, entityId]);
  return (
    <div className={s.overlay}><div className={s.modal + " " + s.modalWide}>
      <h3>Historie · {TYPE_LABELS[entityType] || entityType}</h3>
      {logs.length === 0 && <p className={s.muted}>Keine Einträge</p>}
      {logs.map(l => (
        <div key={l.id} className={s.section}>
          <strong>{ACTION_LABELS[l.action] || l.action}</strong>
          <span className={s.muted}> · {new Date(l.createdAt).toLocaleString("de-DE")}</span>
          <p>{formatDetails(l.details)}</p>
        </div>
      ))}
      <Button onClick={onClose}>Schließen</Button>
    </div></div>
  );
}

export default function History() {
  const [data, setData] = useState<any>({ logs: [], total: 0 });
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");

  useEffect(() => {
    let c = false;
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (entityType) params.set("entityType", entityType);
    api(`/api/history?${params}`).then(d => { if (!c) setData(d); }).catch(() => {});
    return () => { c = true; };
  }, [page, entityType]);

  const cols = [
    { key: "createdAt", label: "Zeit", render: (l: any) => new Date(l.createdAt).toLocaleString("de-DE") },
    { key: "entityType", label: "Typ", render: (l: any) => TYPE_LABELS[l.entityType] || l.entityType },
    { key: "entityId", label: "ID" },
    { key: "action", label: "Aktion", render: (l: any) => ACTION_LABELS[l.action] || l.action },
    { key: "userId", label: "Benutzer" },
    { key: "details", label: "Details", render: (l: any) => formatDetails(l.details) },
  ];

  return (
    <div className={s.page}>
      <PageHeader title="Historie" />
      <div className={s.toolbar}>
        <select className="search-input" value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">Alle</option>
          <option value="person">Personen</option>
          <option value="school">Schulen</option>
          <option value="class">Klassen</option>
          <option value="role">Rollen</option>
          <option value="flag">Flags</option>
          <option value="user">Benutzer</option>
          <option value="import">Import</option>
        </select>
      </div>
      <div className={s.scroll}><DataTable columns={cols} rows={asArray(data.logs)} rowKey="id" /></div>
      <div className={s.pagination}>
        <Button variant="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Zurück</Button>
        <span className={s.pageInfo}>Seite {page}</span>
        <Button variant="small" disabled={page * 50 >= data.total} onClick={() => setPage(p => p + 1)}>Weiter</Button>
      </div>
    </div>
  );
}