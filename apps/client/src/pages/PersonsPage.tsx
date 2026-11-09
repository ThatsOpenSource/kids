import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useDebounced } from '../lib/useDebounced';
import PasswordModal from '../components/PasswordModal';
import s from '../styles/shared.module.css';
import styles from './PersonsPage.module.css';

const ROLE_OPTIONS = [
  { id: 'schueler', label: 'Schüler' },
  { id: 'lehrer', label: 'Lehrer' },
  { id: 'sonstige', label: 'Sonstige' },
  { id: 'klassenlehrer', label: 'Klassenlehrer' },
] as const;

const KONTENTYP_OPTIONS = [
  { id: '', label: 'Alle Kontotypen' },
  { id: '431', label: 'Schüler (431)' },
  { id: '411', label: 'Lehrer (411)' },
  { id: '421', label: 'Sonstige (421)' },
];

function kontentypLabel(k?: number | null) {
  if (k === 431) return 'Schüler (431)';
  if (k === 411) return 'Lehrer (411)';
  if (k === 421) return 'Sonstige (421)';
  return '—';
}

function roleLabel(r: string) {
  return ROLE_OPTIONS.find((x) => x.id === r)?.label || r;
}

function fmtDate(v?: string | null) {
  if (!v) return '—';
  return v.slice(0, 10);
}

export default function PersonsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [facets, setFacets] = useState<{ klassen: string[]; rollen: string[] }>({
    klassen: [],
    rollen: [],
  });
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 300);
  const [schulId, setSchulId] = useState('');
  const [klasse, setKlasse] = useState('');
  const [rolle, setRolle] = useState('');
  const [kontentyp, setKontentyp] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editLkid, setEditLkid] = useState<string | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [pwModal, setPwModal] = useState<{
    scope: 'person' | 'class' | 'school';
    schoolId?: string;
    refValue?: string;
    title: string;
  } | null>(null);
  const [msg, setMsg] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    api.listSchools().then((r) => setSchools(r.schools)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .listPersons({
        schulId: schulId || undefined,
        q: dq || undefined,
        klasse: klasse || undefined,
        rolle: rolle || undefined,
        kontentyp: kontentyp || undefined,
      })
      .then((r) => {
        setPersons(r.persons);
        setFacets({
          klassen: r.facets?.klassen || [],
          rollen: r.facets?.rollen || [],
        });
      })
      .catch(() => setPersons([]))
      .finally(() => setLoading(false));
  }, [schulId, dq, klasse, rolle, kontentyp]);

  useEffect(() => {
    setKlasse('');
  }, [schulId]);

  const allSelected = useMemo(
    () => persons.length > 0 && persons.every((p) => selected.has(p.lkid)),
    [persons, selected]
  );

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(persons.map((p) => p.lkid)));
  }

  function toggleOne(lkid: string) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(lkid)) n.delete(lkid);
      else n.add(lkid);
      return n;
    });
  }

  async function saveRoles(lkid: string) {
    setMsg('');
    try {
      const { person } = await api.patchPerson(lkid, { rollen: editRoles, roles: editRoles });
      setPersons((list) => list.map((p) => (p.lkid === lkid ? { ...p, ...person } : p)));
      setEditLkid(null);
      setMsg('Rollen gespeichert.');
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Fehler');
    }
  }

  function openPwFor(p: any) {
    setPwModal({
      scope: 'person',
      refValue: p.lkid,
      title: `Passwort · ${p.nachname || p.lastName}, ${p.vorname || p.firstName}`,
    });
  }

  return (
    <div className={s.page}>
      <header className={s.toolbarStacked}>
        <div className={s.toolbarRow}>
          <h2 className={s.toolbarTitle}>Personen</h2>
          <span className={s.toolbarSpacer} />
          <span className={s.chip}>{persons.length} Einträge</span>
        </div>
        <div className={`${s.toolbarRow} ${s.filters} ${styles.filterBar}`}>
          <input
            className={s.searchInput}
            placeholder="Suche: Name, LKID, Benutzername, E-Mail…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className={`${s.select} ${styles.filterSelect}`}
            value={schulId}
            onChange={(e) => setSchulId(e.target.value)}
            aria-label="Schule"
          >
            <option value="">Alle Schulen</option>
            {schools.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name} ({sc.id})
              </option>
            ))}
          </select>
          <select
            className={`${s.select} ${styles.filterSelect}`}
            value={klasse}
            onChange={(e) => setKlasse(e.target.value)}
            aria-label="Klasse"
          >
            <option value="">Alle Klassen</option>
            {facets.klassen.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            className={`${s.select} ${styles.filterSelect}`}
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
            aria-label="Rolle"
          >
            <option value="">Alle Rollen</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            className={`${s.select} ${styles.filterSelect}`}
            value={kontentyp}
            onChange={(e) => setKontentyp(e.target.value)}
            aria-label="Kontotyp"
          >
            {KONTENTYP_OPTIONS.map((o) => (
              <option key={o.id || 'all'} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {selected.size > 0 ? (
        <div className={s.selectionBar}>
          <span>{selected.size} ausgewählt</span>
          <button
            type="button"
            className={s.btn}
            onClick={() =>
              setPwModal({
                scope: 'person',
                refValue: [...selected][0],
                title: `Passwort · Auswahl`,
              })
            }
          >
            Passwort
          </button>
          {schulId && klasse ? (
            <button
              type="button"
              className={s.btn}
              onClick={() =>
                setPwModal({
                  scope: 'class',
                  schoolId: schulId,
                  refValue: klasse,
                  title: `Passwort · Klasse ${klasse}`,
                })
              }
            >
              Passwort Klasse
            </button>
          ) : null}
          <button type="button" className={s.btn} onClick={() => setSelected(new Set())}>
            Auswahl aufheben
          </button>
        </div>
      ) : null}

      {msg ? <div className={s.cardOk}>{msg}</div> : null}

      <div className={s.pageBodyFlush}>
        {loading ? (
          <p className={s.loadingText}>Laden…</p>
        ) : (
          <div className={s.tableWrap}>
            <table className={`${s.dataTable} ${styles.personTable}`}>
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Alle" />
                  </th>
                  <th>LKID</th>
                  <th>AMS-ID</th>
                  <th>Nachname</th>
                  <th>Vorname</th>
                  <th>Geburtsdatum</th>
                  <th>Geschlecht</th>
                  <th>Schulbeginn</th>
                  <th>Schulende</th>
                  <th>Kontotyp</th>
                  <th>Rollen</th>
                  <th>Schul-ID</th>
                  <th>Klasse</th>
                  <th>Stufe</th>
                  <th>Benutzername</th>
                  <th>E-Mail</th>
                  <th>E-Mail MDM</th>
                  <th>Apple-ID</th>
                  <th>STO-BN</th>
                  <th>STO-Klasse</th>
                  <th>Anwendungen</th>
                  <th>Aktiv</th>
                  <th>Status</th>
                  <th className={styles.pwCol}>Passwort</th>
                </tr>
              </thead>
              <tbody>
                {persons.map((p) => {
                  const last = p.nachname || p.lastName;
                  const first = p.vorname || p.firstName;
                  return (
                    <tr key={p.lkid} className={styles.row}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(p.lkid)}
                          onChange={() => toggleOne(p.lkid)}
                          aria-label={`Auswählen ${p.lkid}`}
                        />
                      </td>
                      <td className={s.mono}>{p.lkid}</td>
                      <td className={s.monoSmall} title={p.amsId}>
                        {(p.amsId || '').slice(0, 8)}…
                      </td>
                      <td>{last}</td>
                      <td>{first}</td>
                      <td>{fmtDate(p.geburtsdatum || p.dateOfBirth)}</td>
                      <td>{p.geschlecht || p.gender || '—'}</td>
                      <td>{fmtDate(p.schulbeginn || p.schoolEntryDate)}</td>
                      <td>{fmtDate(p.schulende || p.schoolEndDate)}</td>
                      <td>{kontentypLabel(p.kontentyp ?? p.accountType)}</td>
                      <td>
                        {editLkid === p.lkid ? (
                          <div className={s.roleEdit}>
                            {ROLE_OPTIONS.map((r) => (
                              <label key={r.id} className={s.roleCheck}>
                                <input
                                  type="checkbox"
                                  checked={editRoles.includes(r.id)}
                                  onChange={(e) => {
                                    setEditRoles((prev) =>
                                      e.target.checked
                                        ? [...prev, r.id]
                                        : prev.filter((x) => x !== r.id)
                                    );
                                  }}
                                />
                                {r.label}
                              </label>
                            ))}
                            <button
                              type="button"
                              className={s.btnPrimary}
                              disabled={editRoles.length === 0}
                              onClick={() => saveRoles(p.lkid)}
                            >
                              OK
                            </button>
                            <button type="button" className={s.btn} onClick={() => setEditLkid(null)}>
                              Abbrechen
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className={s.btn}
                            onClick={() => {
                              setEditLkid(p.lkid);
                              setEditRoles([...(p.rollen || p.roles || [])]);
                            }}
                            title="Rollen bearbeiten"
                          >
                            {(p.rollen || p.roles || []).map(roleLabel).join(', ') || '—'}
                          </button>
                        )}
                      </td>
                      <td>{p.schulId || p.schoolId}</td>
                      <td>{p.klasse || p.className || '—'}</td>
                      <td>{p.stufe || p.grade || '—'}</td>
                      <td className={s.mono}>{p.benutzername || p.username || '—'}</td>
                      <td>{p.email || '—'}</td>
                      <td>{p.emailMdm || '—'}</td>
                      <td className={s.mono}>{p.appleId || '—'}</td>
                      <td className={s.mono}>{p.stoBnGroup || '—'}</td>
                      <td className={s.mono}>{p.stoClass || '—'}</td>
                      <td>{(p.anwendungen || p.applications || []).join(', ') || '—'}</td>
                      <td>{(p.aktiverBesuch ?? p.activeAttendance) ? 'ja' : 'nein'}</td>
                      <td>
                        {(p.terminiert ?? p.terminated) ? (
                          <span className={s.chipError}>terminiert</span>
                        ) : (
                          <span className={s.chip}>aktiv</span>
                        )}
                      </td>
                      <td className={styles.pwCol}>
                        <div className={styles.pwActions}>
                          {p.hasPassword ? (
                            <button
                              type="button"
                              className={styles.copyBtn}
                              title="Passwort anzeigen / kopieren"
                              onClick={() => openPwFor(p)}
                            >
                              {copied === p.lkid ? 'OK' : 'Kopieren'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.copyBtn}
                              title="Passwort erzeugen"
                              onClick={() => openPwFor(p)}
                            >
                              Setzen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {persons.length === 0 ? (
                  <tr>
                    <td colSpan={24} className={s.muted}>
                      Keine Personen – Import starten oder Filter anpassen.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pwModal ? (
        <PasswordModal
          scope={pwModal.scope}
          schoolId={pwModal.schoolId}
          refValue={pwModal.refValue}
          title={pwModal.title}
          onClose={() => setPwModal(null)}
        />
      ) : null}
    </div>
  );
}
