import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import s from '../styles/shared.module.css';

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AmsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pack, setPack] = useState<{
    schoolId: string;
    generatedAt: string;
    files: Record<string, string>;
    stats: Record<string, number>;
  } | null>(null);
  const [appleMsg, setAppleMsg] = useState('');

  useEffect(() => {
    api.listSchools().then((r) => setSchools(r.schools)).catch(() => {});
  }, []);

  async function onExport() {
    setBusy(true);
    setError('');
    setPack(null);
    try {
      const result = await api.amsExport(schoolId || undefined);
      setPack(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  async function onAppleIds() {
    setBusy(true);
    setAppleMsg('');
    try {
      const r = await api.generateAppleIds(schoolId || undefined);
      setAppleMsg(`${r.generated} Apple IDs generiert.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  function downloadAll() {
    if (!pack) return;
    for (const [name, content] of Object.entries(pack.files)) {
      downloadText(`${name}.csv`, content);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>AMS Export</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>
          Sechs CSV-Dateien. person_id = ams_id (UUID), person_number = LKID.
        </p>

        <div className={s.cardNarrow}>
          <div className={s.field}>
            <label className={s.label} htmlFor="ams-school">
              Schule (leer = alle)
            </label>
            <select
              id="ams-school"
              className={s.select}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">Alle aktiven Schulen</option>
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.id})
                </option>
              ))}
            </select>
          </div>
          <div className={s.btnRow}>
            <button type="button" className={s.btnPrimary} disabled={busy} onClick={onExport}>
              {busy ? 'Erzeuge…' : 'AMS Export erzeugen'}
            </button>
            <button type="button" className={s.btn} disabled={busy} onClick={onAppleIds}>
              Apple IDs generieren
            </button>
          </div>
        </div>

        {error ? <div className={s.cardAlert}>{error}</div> : null}
        {appleMsg ? <div className={s.cardOk}>{appleMsg}</div> : null}

        {pack ? (
          <div>
            <div className={s.stats}>
              {Object.entries(pack.stats).map(([k, v]) => (
                <div className={s.stat} key={k}>
                  <div className={s.statLabel}>{k}</div>
                  <div className={s.statValue}>{v}</div>
                </div>
              ))}
            </div>
            <p className={s.muted}>
              {new Date(pack.generatedAt).toLocaleString('de-DE')} · {pack.schoolId}
            </p>
            <div className={s.btnRow}>
              <button type="button" className={s.btnPrimary} onClick={downloadAll}>
                Alle 6 CSV herunterladen
              </button>
              {Object.keys(pack.files).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={s.btn}
                  onClick={() => downloadText(`${name}.csv`, pack.files[name])}
                >
                  {name}.csv
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
