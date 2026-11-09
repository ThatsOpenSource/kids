import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import s from '../styles/shared.module.css';

type Scope = 'person' | 'class' | 'school' | 'role' | 'all';

export default function PasswordsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [scope, setScope] = useState<Scope>('class');
  const [schoolId, setSchoolId] = useState('');
  const [ref, setRef] = useState('');
  const [force, setForce] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [info, setInfo] = useState('');

  useEffect(() => {
    api.listSchools().then((r) => setSchools(r.schools)).catch(() => {});
  }, []);

  async function run(mode: 'generate' | 'reveal') {
    setBusy(true);
    setError('');
    setRows(null);
    setInfo('');
    try {
      const body = {
        scope,
        ref: ref || undefined,
        schoolId: schoolId || undefined,
        force: mode === 'generate' ? force : undefined,
        confirmPassword,
        totpCode: totpCode || undefined,
      };
      const result =
        mode === 'generate' ? await api.generatePasswords(body) : await api.revealPasswords(body);
      setRows(result.passwords);
      setInfo(
        mode === 'generate'
          ? `${result.count} Passwörter erzeugt (einmalige Anzeige).`
          : `${result.count} gespeicherte Passwörter entschlüsselt.`
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  function downloadCsv() {
    if (!rows?.length) return;
    const header = 'lkid;benutzername;nachname;vorname;klasse;password\n';
    const body = rows
      .map(
        (r) =>
          `${r.lkid};${r.benutzername || ''};${r.nachname};${r.vorname};${r.klasse || ''};${r.password}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passwords-${scope}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>Passwörter</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>
          Personen-Passwörter AES-GCM (entschlüsselbar). App-Logins bleiben bcrypt-only. Step-up mit
          Konto-Passwort (+ 2FA).
        </p>

        <div className={s.cardNarrow}>
          <div className={s.field}>
            <label className={s.label} htmlFor="pw-scope">
              Scope
            </label>
            <select
              id="pw-scope"
              className={s.select}
              value={scope}
              onChange={(e) => setScope(e.target.value as Scope)}
            >
              <option value="person">Person (LKID)</option>
              <option value="class">Klasse</option>
              <option value="school">Schule</option>
              <option value="role">Rolle</option>
              <option value="all">Alle</option>
            </select>
          </div>

          {scope === 'class' || scope === 'school' ? (
            <div className={s.field}>
              <label className={s.label} htmlFor="pw-school">
                Schule
              </label>
              <select
                id="pw-school"
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
          ) : null}

          {scope !== 'school' && scope !== 'all' ? (
            <div className={s.field}>
              <label className={s.label} htmlFor="pw-ref">
                {scope === 'person' ? 'LKID' : scope === 'class' ? 'Klasse' : 'Rolle'}
              </label>
              <input
                id="pw-ref"
                className={s.input}
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </div>
          ) : null}

          <label className={s.labelRow}>
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Bestehende überschreiben (nur Generieren)
          </label>

          <div className={s.field}>
            <label className={s.label} htmlFor="pw-confirm">
              Konto-Passwort *
            </label>
            <input
              id="pw-confirm"
              className={s.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className={s.field}>
            <label className={s.label} htmlFor="pw-totp">
              2FA-Code (falls aktiv)
            </label>
            <input
              id="pw-totp"
              className={s.input}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
          </div>

          <div className={s.btnRow}>
            <button
              type="button"
              className={s.btnPrimary}
              disabled={busy || !confirmPassword}
              onClick={() => run('generate')}
            >
              Generieren
            </button>
            <button
              type="button"
              className={s.btn}
              disabled={busy || !confirmPassword}
              onClick={() => run('reveal')}
            >
              Anzeigen
            </button>
            {rows && rows.length > 0 ? (
              <button type="button" className={s.btn} onClick={downloadCsv}>
                CSV
              </button>
            ) : null}
          </div>
        </div>

        {error ? <div className={s.cardAlert}>{error}</div> : null}
        {info ? <div className={s.cardOk}>{info}</div> : null}

        {rows ? (
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>LKID</th>
                  <th>Benutzername</th>
                  <th>Name</th>
                  <th>Klasse</th>
                  <th>Passwort</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.lkid}>
                    <td className={s.mono}>{r.lkid}</td>
                    <td className={s.mono}>{r.benutzername}</td>
                    <td>
                      {r.nachname}, {r.vorname}
                    </td>
                    <td>{r.klasse || '—'}</td>
                    <td className={s.mono}>{r.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
