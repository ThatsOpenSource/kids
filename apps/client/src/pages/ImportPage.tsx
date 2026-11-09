import { useCallback, useState } from 'react';
import { extractXmlFilesFromZip } from '../lib/zipXml';
import { api } from '../lib/api';
import type { ImportPreview, Person } from '@kids/shared';
import s from '../styles/shared.module.css';

export default function ImportPage() {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [generatedPw, setGeneratedPw] = useState<
    Array<{ lkid: string; password: string; benutzername?: string }> | null
  >(null);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setPreview(null);
    setCommitMsg('');
    setGeneratedPw(null);
    setSources([]);
    setBusy(true);
    try {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        throw new Error('Bitte eine ZIP-Datei wählen (Schul-XML-Paket oder SuS/LuL-ZIP).');
      }
      const xmls = await extractXmlFilesFromZip(file);
      setSources(xmls.map((x) => x.path || x.filename));

      const mergedPersons: Person[] = [];
      const allDiffs: ImportPreview['diffs'] = [];
      const warnings: string[] = [];
      let schoolId = '';
      let totalStudents = 0;
      let totalTeachers = 0;

      for (const xml of xmls) {
        const result = await api.importPreview(xml.filename, xml.contentBase64);
        schoolId = result.schoolId || schoolId;
        totalStudents += result.totalStudents || 0;
        totalTeachers += result.totalTeachers || 0;
        warnings.push(...(result.warnings || []));
        for (const p of result.persons) {
          const idx = mergedPersons.findIndex((m) => m.lkid === p.lkid);
          if (idx >= 0) mergedPersons[idx] = { ...mergedPersons[idx], ...p };
          else mergedPersons.push(p);
        }
        for (const d of result.diffs || []) {
          const existing = allDiffs.find((x) => x.lkid === d.lkid);
          if (!existing) allDiffs.push(d);
        }
      }

      setPreview({
        schoolId,
        persons: mergedPersons,
        diffs: allDiffs,
        warnings,
        totalStudents,
        totalTeachers,
        missingRequired: [],
      } as ImportPreview);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }, []);

  async function onCommit() {
    if (!preview) return;
    setBusy(true);
    setError('');
    setGeneratedPw(null);
    try {
      const res = await api.importCommit(preview.persons, true);
      setCommitMsg(
        `Import: ${res.inserted} neu, ${res.updated} aktualisiert, ${res.skippedUnchanged ?? 0} unverändert.`
      );
      if (res.generatedPasswords?.length) setGeneratedPw(res.generatedPasswords);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>Import</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>
          ZIP hochladen: einzelne Schul-XML-ZIP (SuS oder LuL) oder Gesamt-Paket mit verschachtelten
          XMLs. Alle gefundenen XMLs werden eingelesen und zusammengeführt (Schlüssel: LKID).
        </p>

        <div
          className={drag ? s.dropzoneActive : s.dropzone}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) void handleFile(f);
          }}
        >
          <p className={s.muted}>ZIP hierher ziehen oder Datei wählen</p>
          <label className={s.btnPrimary}>
            Datei wählen
            <input
              className={s.hiddenFile}
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </label>
          {busy ? <p className={s.mt}>Verarbeite…</p> : null}
        </div>

        {sources.length > 0 ? (
          <p className={s.muted}>
            Gefundene XML-Quellen: {sources.join(' · ')}
          </p>
        ) : null}

        {error ? <div className={s.cardAlert}>{error}</div> : null}
        {commitMsg ? <div className={s.cardOk}>{commitMsg}</div> : null}

        {generatedPw && generatedPw.length > 0 ? (
          <div className={s.card}>
            <h3 className={s.heading}>Einmalige Passwort-Anzeige (neue Personen)</h3>
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>LKID</th>
                    <th>Benutzername</th>
                    <th>Passwort</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedPw.map((r) => (
                    <tr key={r.lkid}>
                      <td className={s.mono}>{r.lkid}</td>
                      <td className={s.mono}>{r.benutzername}</td>
                      <td className={s.mono}>{r.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {preview ? (
          <div className={s.mt}>
            <div className={s.stats}>
              <div className={s.stat}>
                <div className={s.statLabel}>Schule</div>
                <div className={s.statValue}>{preview.schoolId}</div>
              </div>
              <div className={s.stat}>
                <div className={s.statLabel}>Schüler</div>
                <div className={s.statValue}>{preview.totalStudents}</div>
              </div>
              <div className={s.stat}>
                <div className={s.statLabel}>Lehrer</div>
                <div className={s.statValue}>{preview.totalTeachers}</div>
              </div>
              <div className={s.stat}>
                <div className={s.statLabel}>Personen</div>
                <div className={s.statValue}>{preview.persons.length}</div>
              </div>
            </div>

            <div className={s.btnRow}>
              <button type="button" className={s.btnPrimary} disabled={busy} onClick={onCommit}>
                Import bestätigen
              </button>
              <button type="button" className={s.btn} onClick={() => setPreview(null)}>
                Verwerfen
              </button>
            </div>

            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>LKID</th>
                    <th>Nachname</th>
                    <th>Vorname</th>
                    <th>Geburtsdatum</th>
                    <th>Geschlecht</th>
                    <th>Schulbeginn</th>
                    <th>Kontotyp</th>
                    <th>Rollen</th>
                    <th>Schul-ID</th>
                    <th>Klasse</th>
                    <th>Stufe</th>
                    <th>Benutzername</th>
                    <th>E-Mail</th>
                    <th>Anwendungen</th>
                    <th>Aktiv</th>
                    <th>Terminiert</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.persons.slice(0, 300).map((p) => {
                    const status = preview.diffs.find((d) => d.lkid === p.lkid)?.status ?? 'new';
                    const dob = p.geburtsdatum
                      ? String(p.geburtsdatum).slice(0, 10)
                      : '—';
                    const entry = (p as any).schoolEntryDate
                      ? String((p as any).schoolEntryDate).slice(0, 10)
                      : '—';
                    return (
                      <tr key={p.lkid}>
                        <td>
                          <span className={s.chip}>{status}</span>
                        </td>
                        <td className={s.mono}>{p.lkid}</td>
                        <td>{p.nachname}</td>
                        <td>{p.vorname}</td>
                        <td>{dob}</td>
                        <td>{p.geschlecht || '—'}</td>
                        <td>{entry}</td>
                        <td>{p.kontentyp ?? '—'}</td>
                        <td>{(p.rollen || []).join(', ')}</td>
                        <td>{p.schulId}</td>
                        <td>{p.klasse || '—'}</td>
                        <td>{p.stufe || '—'}</td>
                        <td className={s.mono}>{p.benutzername || '—'}</td>
                        <td>{p.email || '—'}</td>
                        <td>{(p.anwendungen || []).join(', ') || '—'}</td>
                        <td>{p.aktiverBesuch ? 'ja' : 'nein'}</td>
                        <td>{p.terminiert ? 'ja' : 'nein'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
