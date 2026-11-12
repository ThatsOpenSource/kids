import { useEffect, useState, useMemo } from "react";
import { api, asArray } from "../lib/api";
import { useDebounce } from "../lib/useDebounce";
import DataTable, { Column } from "../components/DataTable";
import Button from "../components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faClockRotateLeft, faCopy } from "@fortawesome/free-solid-svg-icons";
import FilterDropdown from "../components/FilterDropdown";
import { HistoryDialog } from "./History";
import { PERSON_COLUMNS } from "../lib/columns";
import styles from "./Persons.module.css";
import s from "../styles/page.module.css";

function Chip({ yes, yesLabel, noLabel }: { yes: boolean; yesLabel: string; noLabel: string }) {
  return <span className={s.chip + " " + (yes ? s.chipOn : s.chipOff)}>{yes ? yesLabel : noLabel}</span>;
}

function CopyPw({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const data = await api(`/api/persons/${id}/copy-password`, { method: "POST", body: "{}" });
    await navigator.clipboard.writeText(data.password || "");
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return <button onClick={copy} title="Kopieren"><FontAwesomeIcon icon={faCopy} /></button>;
}

type PwMode = "default" | "custom" | "ruleset";

const COLUMNS: Column[] = PERSON_COLUMNS;

export default function Persons() {
  const [data, setData] = useState<any>({ persons: [], total: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 200);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterSchool, setFilterSchool] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterFlag, setFilterFlag] = useState<string[]>([]);
  const [filterStufe, setFilterStufe] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [allFlags, setAllFlags] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [edit, setEdit] = useState<any>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwMode, setPwMode] = useState<PwMode>("default");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwTotp, setPwTotp] = useState("");
  const [pwCustom, setPwCustom] = useState("");
  const [pwForce, setPwForce] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    api("/api/config/roles").then(d => { if (!c) setAllRoles(asArray(d)); }).catch(() => {});
    api("/api/config/flags").then(d => { if (!c) setAllFlags(asArray(d)); }).catch(() => {});
    api("/api/schools").then(d => { if (!c) setAllSchools(asArray(d)); }).catch(() => {});
    return () => { c = true; };
  }, []);

  useEffect(() => {
    let c = false;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filterSchool.length) params.set("school", filterSchool.join(","));
    if (filterRole.length) params.set("role", filterRole.join(","));
    if (filterFlag.length) params.set("flag", filterFlag.join(","));
    if (filterStufe.length) params.set("stufe", filterStufe.join(","));
    if (debounced) params.set("q", debounced);
    if (sort) { params.set("sort", sort.key); params.set("dir", sort.dir); }
    api(`/api/persons?${params}`).then(d => { if (!c) setData(d); }).catch(() => { if (!c) setData({ persons: [], total: 0 }); });
    return () => { c = true; };
  }, [page, limit, filterSchool, filterRole, filterFlag, filterStufe, debounced, sort]);

  const schoolOpts = allSchools.map(s => ({ value: s.sid, label: `${s.sid} – ${s.name}` }));
  const roleOpts = allRoles.map(r => ({ value: r.label, label: r.label }));
  const flagOpts = allFlags.map(f => ({ value: f.dataId, label: f.label }));
  const stufeOpts = ["1","2","3","4","5","6","7","8","9","10","11","12","13"].map(s => ({ value: s, label: s }));

  const allPersons = asArray(data.persons);
  const filtered = useMemo(() => {
    if (!debounced) return allPersons;
    const q = debounced.toLowerCase();
    return allPersons.filter((p: any) => [p.lkid, p.name, p.firstName, p.username, p.sid, p.email].join(" ").toLowerCase().includes(q));
  }, [allPersons, debounced]);

  const totalPages = Math.max(1, Math.ceil(data.total / limit));
  const needStepUp = selected.size > 3;
  async function doGenerate() {
    setPwBusy(true);
    const body: any = { personIds: [...selected], mode: pwMode, force: pwForce };
    if (pwMode === "custom") body.customPassword = pwCustom;
    if (needStepUp) { body.confirmPassword = pwConfirm; body.totpCode = pwTotp; }
    await api("/api/passwords/generate", { method: "POST", body: JSON.stringify(body) });
    setPwBusy(false); setPwOpen(false); setPwConfirm(""); setPwTotp(""); setPwCustom(""); setPwForce(false);
  }

  const cols: Column[] = [...COLUMNS, { key: "pw", label: "Passwort", render: (r) => <span className={s.pw}>{r.hasPassword ? "•••••" : "–"}</span> }, { key: "pwcopy", label: "", render: (r) => r.hasPassword ? <CopyPw id={r.id} /> : null }, { key: "actions", label: "", render: (r) => <span onClick={e => e.stopPropagation()}><Button variant="small" onClick={() => setEdit(r)}><FontAwesomeIcon icon={faPen} /></Button><Button variant="small" onClick={() => setHistoryId(r.id)}><FontAwesomeIcon icon={faClockRotateLeft} /></Button></span> }];

  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <h2 className={s.title}>Personen</h2>
        <div className={s.spacer} />
        {selected.size > 0 && <Button variant="primary" onClick={() => setPwOpen(true)}>Passwort ({selected.size})</Button>}
        <span className={s.muted}>{data.total} Einträge</span>
      </header>
      <div className={styles.toolbar}>
        <input type="search" className={"search-input " + styles.search} placeholder="role:Lehrer flag:iot school:23045 name:Müller" value={search} onChange={e => setSearch(e.target.value)} />
        <FilterDropdown label="Schule" options={schoolOpts} selected={filterSchool} onChange={v => { setFilterSchool(v); setPage(1); }} />
        <FilterDropdown label="Rolle" options={roleOpts} selected={filterRole} onChange={v => { setFilterRole(v); setPage(1); }} />
        <FilterDropdown label="Flags" options={flagOpts} selected={filterFlag} onChange={v => { setFilterFlag(v); setPage(1); }} />
        <FilterDropdown label="Stufe" options={stufeOpts} selected={filterStufe} onChange={v => { setFilterStufe(v); setPage(1); }} />
      </div>
      <div className={styles.tableArea}>
        <DataTable columns={cols} rows={filtered} rowKey="id" selected={selected} onSelect={(id, c) => setSelected(prev => { const n = new Set(prev); c ? n.add(id) : n.delete(id); return n; })} onSelectAll={async (checked) => { if (!checked) { setSelected(new Set()); return; } const all = await api(`/api/persons?limit=9999&${new URLSearchParams({ q: debounced, school: filterSchool.join(","), role: filterRole.join(","), flag: filterFlag.join(",") })}`); setSelected(new Set(asArray(all.persons).map((p: any) => p.id))); }} allSelected={selected.size > 0 && selected.size >= data.total} onSort={(key, dir) => setSort(dir ? { key, dir } : null)} onRowClick={(row) => setOverview(row)} />
      </div>
      <div className={s.pagination}>
        <select className={s.pageSize} value={limit} onChange={e => { setLimit(+e.target.value); setPage(1); }}>
          {[25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className={s.pageInfo}>Seite {page} von {totalPages}</span>
        <Button variant="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Zurück</Button>
        <Button variant="small" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Weiter</Button>
      </div>
      {pwOpen && (
        <div className={s.overlay}><div className={s.modal}>
          <h3>Passwörter generieren ({selected.size})</h3>
          <div className={s.mb}>
            <label className={s.check + (pwMode === "default" ? " " + s.checkOn : "")} onClick={() => setPwMode("default")}>Standardregeln</label>
            <label className={s.check + (pwMode === "ruleset" ? " " + s.checkOn : "")} onClick={() => setPwMode("ruleset")}>Regeln anwenden</label>
            <label className={s.check + (pwMode === "custom" ? " " + s.checkOn : "")} onClick={() => setPwMode("custom")}>Einheitlich</label>
          </div>
          {pwMode === "custom" && <input className={"search-input " + s.field} placeholder="Einheitliches Passwort" value={pwCustom} onChange={e => setPwCustom(e.target.value)} />}
          <p className={s.muted}>{pwMode === "custom" ? `Einheitlich: ${pwCustom || "(leer)"}` : pwMode === "ruleset" ? "Regeln aus Passwort-Regeln" : "Standardregeln"} · {pwForce ? "Überschreibt vorhandene" : "Nur leere"}</p>
          <label className={s.check + (pwForce ? " " + s.checkOn : "")} onClick={() => setPwForce(f => !f)}>Vorhandene überschreiben</label>
          {needStepUp && (
            <div className={s.mt}>
              <input className={"search-input " + s.field} type="password" placeholder="Dein Passwort" autoComplete="off" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
              <input className={"search-input " + s.field} placeholder="2FA-Code" value={pwTotp} onChange={e => setPwTotp(e.target.value)} />
            </div>
          )}
          <div className={s.mt}>
            <Button variant="primary" onClick={doGenerate} disabled={pwBusy || (needStepUp && (!pwConfirm || !pwTotp))}>{pwBusy ? "…" : "Generieren"}</Button>
            <Button onClick={() => setPwOpen(false)}>Abbrechen</Button>
          </div>
        </div></div>
      )}
      {historyId && <HistoryDialog entityType="person" entityId={historyId} onClose={() => setHistoryId(null)} />}
      {overview && (
        <div className={s.overlay} onClick={() => setOverview(null)}><div className={s.modal + " " + s.modalWide} onClick={e => e.stopPropagation()}>
          <div className={s.row} style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div><h3 style={{ margin: 0 }}>{overview.firstName} {overview.name}</h3><p className={s.muted}>{overview.email || overview.systemEmail}</p></div>
            <Button variant="small" onClick={() => { setEdit(overview); setOverview(null); }}><FontAwesomeIcon icon={faPen} /></Button>
          </div>
          <div className={s.grid}>
            {[["LKID", overview.lkid], ["SID", overview.sid], ["SGID", overview.sgid], ["SOID", overview.soid], ["Schule", overview.schoolName], ["Typ", overview.schoolType], ["Rolle", asArray(overview.roles).join(", ")], ["Klasse", overview.klasse], ["Stufe", overview.stufe], ["Benutzername", overview.username], ["Apple ID", overview.appleId], ["System-E-Mail", overview.systemEmail], ["Geburt", overview.dateOfBirth], ["Flags", asArray(overview.flags).join(", ")], ["Aktiv", overview.active ? "Ja" : "Nein"], ["Erstellt", overview.createdAt]].map(([k, v]) => (
              <div key={k}><span className={s.muted}>{k}</span><p style={{ margin: "4px 0 0" }}>{v || "–"}</p></div>
            ))}
          </div>
          <div className={s.mt}><Button onClick={() => setOverview(null)}>Schließen</Button></div>
        </div></div>
      )}
      {edit && (
        <div className={s.overlay}><div className={s.modal + " " + s.modalWide}>
            <h3>Person bearbeiten</h3>
            {["name", "firstName", "email", "username", "stufe", "klasse"].map(f => (
              <label key={f}>{f}<input className={"search-input " + s.field} value={edit[f] || ""} onChange={e => setEdit({ ...edit, [f]: e.target.value })} /></label>
            ))}
            <div className={s.mt}>
              <Button variant="primary" onClick={async () => { await api(`/api/persons/${edit.id}`, { method: "PUT", body: JSON.stringify(edit) }); setEdit(null); }}>Speichern</Button>
              <Button onClick={async () => { await api("/api/passwords/generate", { method: "POST", body: JSON.stringify({ personIds: [edit.id], mode: "default" }) }); }}>Passwort erzeugen</Button>
              <Button onClick={() => setEdit(null)}>Abbrechen</Button>
            </div>
        </div></div>
      )}
    </div>
  );
}