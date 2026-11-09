import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authStore';
import s from '../styles/shared.module.css';

export default function ExportPage() {
  const { totpEnabled } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [klasse, setKlasse] = useState('');
  const [klassen, setKlassen] = useState<string[]>([]);
  const [headers, setHeaders] = useState(true);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    api.listSchools().then((r) => setSchools(r.schools)).catch(() => {});
  }, []);

  useEffect(() => {
    setKlasse('');
    if (!schoolId) {
      setKlassen([]);
      return;
    }
    api
      .listPersons({ schulId: schoolId })
      .then((r) => setKlassen(r.facets?.klassen || []))
      .catch(() => setKlassen([]));
  }, [schoolId]);

  async function onExport() {
    if (!schoolId) {
      setError('Schule wählen (Export ist schul- oder klassenbezogen)');
      return;
    }
    setBusy(true);
    setError('');
    setInfo('');
    try {
      const res = await api.exportCsv({
        schoolId,
        klasse: klasse || undefined,
        includeHeaders: headers,
        confirmPassword,
        totpCode: totpEnabled ? totpCode : undefined,
      });
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      setInfo(`${res.count} Zeilen exportiert → ${res.filename}`);
      setConfirmPassword('');
      setTotpCode('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>CSV-Export</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>
          Export immer auf Schule oder Klasse begrenzt. Zur Bestätigung Konto-Passwort
          {totpEnabled ? ' und 2FA-Code' : ''} erneut eingeben.
        </p>

        <div className={s.cardNarrow}>
          <div className={s.field}>
            <label className={s.label} htmlFor="ex-school">
              Schule *
            </label>
            <select
              id="ex-school"
              className={s.select}
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
            >
              <option value="">— wählen —</option>
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.id})
                </option>
              ))}
            </select>
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="ex-klasse">
              Klasse (optional)
            </label>
            <select
              id="ex-klasse"
              className={s.select}
              value={klasse}
              onChange={(e) => setKlasse(e.target.value)}
              disabled={!schoolId}
            >
              <option value="">Ganze Schule</option>
              {klassen.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <label className={s.labelRow}>
            <input type="checkbox" checked={headers} onChange={(e) => setHeaders(e.target.checked)} />
            CSV-Headerzeile
          </label>

          <div className={s.field}>
            <label className={s.label} htmlFor="ex-pw">
              Konto-Passwort bestätigen *
            </label>
            <input
              id="ex-pw"
              className={s.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {totpEnabled ? (
            <div className={s.field}>
              <label className={s.label} htmlFor="ex-totp">
                2FA-Code *
              </label>
              <input
                id="ex-totp"
                className={s.input}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </div>
          ) : null}

          <button
            type="button"
            className={s.btnPrimary}
            disabled={busy || !confirmPassword}
            onClick={onExport}
          >
            {busy ? 'Exportiere…' : 'CSV herunterladen'}
          </button>
        </div>

        {error ? <div className={s.cardAlert}>{error}</div> : null}
        {info ? <div className={s.cardOk}>{info}</div> : null}
      </div>
    </div>
  );
}
