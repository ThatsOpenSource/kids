import { useEffect, useState, useMemo } from "react";
import { api, asArray } from "../lib/api";
import { useDebounce } from "../lib/useDebounce";
import DataTable, { Column } from "../components/DataTable";
import Button from "../components/Button";
import FilterDropdown from "../components/FilterDropdown";

function Chip({ yes, yesLabel, noLabel }: { yes: boolean; yesLabel: string; noLabel: string }) {
  return (
    <span className="chip" style={{
      background: yes ? "#111" : "var(--bg)",
      color: yes ? "#fff" : "var(--text-muted)",
      borderColor: yes ? "#111" : "var(--border)",
    }}>{yes ? yesLabel : noLabel}</span>
  );
}

function CopyPw({ id }: { id: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const data = await api(`/api/persons/${id}/copy-password`, { method: "POST", body: "{}" });
    await navigator.clipboard.writeText(data.password || "");
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return <Button variant="small" onClick={copy}>{done ? "Kopiert" : "Kopieren"}</Button>;
}

const COLUMNS: Column[] = [
  { key: "sid", label: "SID" },
  { key: "sgid", label: "SGID" },
  { key: "soid", label: "SOID" },
  { key: "schoolName", label: "Schulname" },
  { key: "schoolType", label: "Schultyp" },
  { key: "klasse", label: "Klasse" },
  { key: "stufe", label: "Stufe" },
  { key: "roles", label: "Rolle", render: (r) => (r.roles || []).map((x: string) => <span key={x} className="chip chip-role">{x}</span>) },
  { key: "lkid", label: "LKID" },
  { key: "name", label: "Name" },
  { key: "firstName", label: "Vorname" },
  { key: "dateOfBirth", label: "Geburt" },
  { key: "username", label: "Benutzername" },
  { key: "appleId", label: "Apple ID" },
  { key: "email", label: "persön. E-Mail" },
  { key: "systemEmail", label: "System-E-Mail" },
  { key: "flags", label: "Flags", render: (r) => (r.flagLabels || r.flags || []).map((f: string) => <span key={f} className="chip chip-flag">{f}</span>) },
  { key: "active", label: "aktiv. Besuch", render: (r) => <Chip yes={r.active} yesLabel="Aktiv" noLabel="Inaktiv" /> },
  { key: "terminated", label: "terminiert?", render: (r) => <Chip yes={r.terminated} yesLabel="Terminiert" noLabel="Offen" /> },
  { key: "pw", label: "Passwort", render: (r) => <span style={{ letterSpacing: 2, fontFamily: "monospace" }}>{r.hasPassword ? "•••••" : "–"}</span> },
  { key: "pwcopy", label: "", render: (r) => r.hasPassword ? <CopyPw id={r.id} /> : null },
];

type SortState = { key: string; dir: "asc" | "desc" } | null;
type PwMode = "default" | "custom" | "ruleset";

export default function Persons() {
  const [data, setData] = useState<any>({ persons: [], total: 0 });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 200);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortState>(null);
  const [filterSchool, setFilterSchool] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string[]>([]);
  const [filterFlag, setFilterFlag] = useState<string[]>([]);
  const [filterStufe, setFilterStufe] = useState<string[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [allFlags, setAllFlags] = useState<any[]>([]);
  const [allSchools, setAllSchools] = useState<any[]>([]);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwMode, setPwMode] = useState<PwMode>("default");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwTotp, setPwTotp] = useState("");
  const [pwCustom, setPwCustom] = useState("");
  const [pwForce, setPwForce] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    api("/api/config/roles").then(d => setAllRoles(asArray(d))).catch(() => {});
    api("/api/config/flags").then(d => setAllFlags(asArray(d))).catch(() => {});
    api("/api/schools").then(d => setAllSchools(asArray(d))).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filterSchool.length) params.set("school", filterSchool.join(","));
    if (filterRole.length) params.set("role", filterRole.join(","));
    if (filterFlag.length) params.set("flag", filterFlag.join(","));
    if (filterStufe.length) params.set("stufe", filterStufe.join(","));
    if (debounced) params.set("q", debounced);
    api(`/api/persons?${params}`).then(d => { if (!cancelled) setData(d); }).catch(() => { if (!cancelled) setData({ persons: [], total: 0 }); });
    return () => { cancelled = true; };
  }, [page, limit, filterSchool, filterRole, filterFlag, filterStufe, debounced]);

  const schoolOpts = allSchools.map(s => ({ value: s.sid, label: `${s.sid} – ${s.name}` }));
  const roleOpts = allRoles.map(r => ({ value: r.label, label: r.label }));
  const flagOpts = allFlags.map(f => ({ value: f.dataId, label: f.label }));
  const stufeOpts = ["1","2","3","4","5","6","7","8","9","10","11","12","13"].map(s => ({ value: s, label: s }));

  const allPersons = asArray(data.persons);

  const filtered = useMemo(() => {
    let list = allPersons;
    if (debounced) {
      const tokens = debounced.trim().split(/\s+/);
      list = list.filter((p: any) => {
        return tokens.every(tok => {
          const m = tok.match(/^(\w+):(.*)$/);
          if (m) {
            const [, prefix, val] = m;
            const q = val.toLowerCase();
            const map: Record<string, string[]> = {
              role: p.roles || [],
              vce: (p.vceTypes || []).map(String),
              flag: p.flags || [],
              school: [p.sid, p.sgid, p.schoolName],
              stufe: [p.stufe],
              klasse: [p.klasse],
              name: [p.name, p.firstName],
              lkid: [p.lkid],
              user: [p.username],
            };
            const fields = map[prefix.toLowerCase()] || [];
            return fields.some(f => String(f || "").toLowerCase().includes(q));
          }
          const q = tok.toLowerCase();
          const blob = [p.lkid, p.name, p.firstName, p.username, p.sid, p.sgid, p.soid, p.schoolName, p.klasse, p.stufe, ...(p.roles || []), ...(p.roleDataIds || []), ...(p.vceTypes || []).map(String), ...(p.flags || [])].join(" ").toLowerCase();
          return blob.includes(q);
        });
      });
    }

    if (!sort) {
      list = [...list].sort((a, b) => {
        const sa = a.sid || ""; const sb = b.sid || "";
        if (sa !== sb) return sa.localeCompare(sb);
        const ra = (a.roles || [])[0] || ""; const rb = (b.roles || [])[0] || "";
        if (ra !== rb) return ra.localeCompare(rb);
        if (a.isPupil && b.isPupil) {
          const ga = a.stufe || ""; const gb = b.stufe || "";
          if (ga !== gb) return ga.localeCompare(gb, "de", { numeric: true });
          const ca = a.klasse || ""; const cb = b.klasse || "";
          if (ca !== cb) return ca.localeCompare(cb, "de");
        }
        return (a.name || "").localeCompare(b.name || "", "de");
      });
    } else {
      list = [...list].sort((a, b) => {
        const va = String(a[sort.key] ?? ""); const vb = String(b[sort.key] ?? "");
        return sort.dir === "asc" ? va.localeCompare(vb, "de") : vb.localeCompare(va, "de");
      });
    }
    return list;
  }, [allPersons, debounced, sort, filterSchool, filterRole, filterFlag, filterStufe]);

  const totalPages = Math.max(1, Math.ceil((data.total || 1) / limit));
  const pageIds = filtered.map((p: any) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id: string) => selected.has(id));
  const needStepUp = selected.size > 3 || pwForce;

  function toggle(id: string, checked: boolean) {
    setSelected(prev => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }
  function toggleAll(checked: boolean) {
    setSelected(prev => {
      const n = new Set(prev);
      if (checked) pageIds.forEach((id: string) => n.add(id));
      else pageIds.forEach((id: string) => n.delete(id));
      return n;
    });
  }
  function cycleSort(key: string) {
    setSort(prev => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  async function doGenerate() {
    if (needStepUp && (!pwConfirm || !pwTotp)) return;
    setPwBusy(true);
    try {
      const body: any = { scope: "person", refs: [...selected], force: pwForce, confirmPassword: pwConfirm || "ok", mode: pwMode };
      if (pwMode === "custom") body.customPassword = pwCustom;
      const res = await api("/api/passwords/generate", { method: "POST", body: JSON.stringify(body) });
      if (res.generated > 0) {
        setData((prev: any) => ({
          ...prev,
          persons: prev.persons.map((p: any) => selected.has(p.id) ? { ...p, hasPassword: true } : p),
        }));
      }
      setPwOpen(false);
      setSelected(new Set());
      setPwConfirm(""); setPwTotp(""); setPwCustom(""); setPwForce(false); setPwMode("default");
    } catch { /* ErrorBox could be wired */ }
    setPwBusy(false);
  }

  const cols = COLUMNS.map(c => ({
    ...c,
    label: c.key === "pwcopy" ? "" : (
      <span style={{ cursor: "pointer", userSelect: "none" }} onClick={() => cycleSort(c.key)}>
        {c.label}{sort?.key === c.key ? (sort.dir === "asc" ? " ↑" : " ↓") : ""}
      </span>
    ) as any,
  }));

  const previewText = pwMode === "custom" ? `Einheitlich: ${pwCustom || "(leer)"}` : pwMode === "ruleset" ? "Regeln aus Passwort-Regeln" : "Standardregeln (Grundschule-Wort / 7-alnum / 9-Staff)";

  return (
    <div className="tab-panel active" style={{ display: "flex" }}>
      <header className="toolbar toolbar-stacked">
        <div className="toolbar-row">
          <h2 style={{ margin: 0 }}>Personen</h2>
          <span className="toolbar-spacer" />
          <span className="status-chip">{data.total || 0} Einträge</span>
          {selected.size > 0 && <span className="status-chip">{selected.size} ausgewählt</span>}
          {selected.size > 0 && <Button variant="small" onClick={() => setPwOpen(true)}>Passwörter generieren</Button>}
        </div>
        <div className="toolbar-row filters">
          <input type="search" className="search-input" placeholder="role:Lehrer flag:iot school:23045 stufe:9 name:Müller" value={search} onChange={e => setSearch(e.target.value)} />
          <FilterDropdown label="Schule" options={schoolOpts} selected={filterSchool} onChange={v => { setFilterSchool(v); setPage(1); }} />
          <FilterDropdown label="Rolle" options={roleOpts} selected={filterRole} onChange={v => { setFilterRole(v); setPage(1); }} />
          <FilterDropdown label="Flags" options={flagOpts} selected={filterFlag} onChange={v => { setFilterFlag(v); setPage(1); }} />
          <FilterDropdown label="Stufe" options={stufeOpts} selected={filterStufe} onChange={v => { setFilterStufe(v); setPage(1); }} />
          <Button variant="small" onClick={() => { setSearch(""); setFilterSchool([]); setFilterRole([]); setFilterFlag([]); setFilterStufe([]); }}>Alle Filter zurücksetzen</Button>
        </div>
      </header>
      <div className="table-area" style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ flex: 1, overflow: "auto" }}>
          <DataTable columns={cols} rows={filtered} rowKey="id" selected={selected} onSelect={toggle} onSelectAll={toggleAll} allSelected={allPageSelected} />
        </div>
        <div className="pagination-bar pagination-bottom">
          <label className="page-size">
            <span className="filter-label">Einträge pro Seite</span>
            <select className="page-size-select" value={limit} onChange={e => { setLimit(+e.target.value); setPage(1); }}>
              <option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
            </select>
          </label>
          <Button variant="small" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Zurück</Button>
          <span className="page-info">Seite {page} von {totalPages} · {data.total || 0} Einträge</span>
          <Button variant="small" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Weiter</Button>
        </div>
      </div>

      {pwOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "var(--panel)", padding: 24, borderRadius: "var(--radius)", width: 460, border: "1px solid var(--border)" }}>
            <h3 style={{ margin: "0 0 12px" }}>Passwörter generieren ({selected.size})</h3>
            <div style={{ marginBottom: 12 }}>
              <label className="chip" style={{ cursor: "pointer", marginRight: 6 }} onClick={() => setPwMode("default")}>{pwMode === "default" ? "✓" : "○"} Standardregeln</label>
              <label className="chip" style={{ cursor: "pointer", marginRight: 6 }} onClick={() => setPwMode("ruleset")}>{pwMode === "ruleset" ? "✓" : "○"} Regeln anwenden</label>
              <label className="chip" style={{ cursor: "pointer" }} onClick={() => setPwMode("custom")}>{pwMode === "custom" ? "✓" : "○"} Einheitlich</label>
            </div>
            {pwMode === "custom" && (
              <input className="search-input" style={{ width: "100%", marginBottom: 8 }} placeholder="Einheitliches Passwort" value={pwCustom} onChange={e => setPwCustom(e.target.value)} />
            )}
            <div className="card" style={{ padding: 10, marginBottom: 12, fontSize: ".82rem", color: "var(--text-muted)" }}>
              Vorschau: {previewText}<br />
              {pwForce ? "Überschreibt vorhandene Passwörter" : "Nur leere Passwörter"}
            </div>
            <label className="chip" style={{ cursor: "pointer", marginBottom: 12, display: "inline-block" }} onClick={() => setPwForce(f => !f)}>
              {pwForce ? "✓" : "○"} Vorhandene überschreiben
            </label>
            {needStepUp && (
              <div style={{ marginTop: 8 }}>
                <input className="search-input" type="password" style={{ width: "100%", marginBottom: 6 }} placeholder="Dein Passwort" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} />
                <input className="search-input" style={{ width: "100%", marginBottom: 6 }} placeholder="2FA-Code" value={pwTotp} onChange={e => setPwTotp(e.target.value)} />
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <Button variant="primary" onClick={doGenerate} disabled={pwBusy || (needStepUp && (!pwConfirm || !pwTotp))}>{pwBusy ? "…" : "Generieren"}</Button>
              <Button style={{ marginLeft: 8 }} onClick={() => setPwOpen(false)}>Abbrechen</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}