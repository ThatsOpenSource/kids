import { useState } from 'react';
import { api } from '../lib/api';
import s from '../styles/shared.module.css';
import styles from './PasswordModal.module.css';

type Props = {
  scope: 'person' | 'class' | 'school';
  schoolId?: string;
  refValue?: string;
  title: string;
  onClose: () => void;
};

export default function PasswordModal({ scope, schoolId, refValue, title, onClose }: Props) {
  const [confirmPassword, setConfirmPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<any[] | null>(null);
  const [info, setInfo] = useState('');

  async function run(mode: 'generate' | 'reveal') {
    setBusy(true);
    setError('');
    setRows(null);
    setInfo('');
    try {
      const body = {
        scope,
        ref: refValue || undefined,
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
          ? `${result.count} Passwort(e) erzeugt (einmalige Anzeige).`
          : `${result.count} Passwort(e) entschlüsselt.`
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <header className={styles.head}>
          <h3 className={styles.title}>{title}</h3>
          <button type="button" className={s.btn} onClick={onClose}>
            Schließen
          </button>
        </header>
        <div className={styles.body}>
          <p className={s.muted}>
            Personen-Passwörter werden verschlüsselt gespeichert und können hier einmalig angezeigt
            werden. Konto-Passwort (+ 2FA) zur Bestätigung.
          </p>
          <div className={s.field}>
            <label className={s.label} htmlFor="pm-pw">
              Konto-Passwort *
            </label>
            <input
              id="pm-pw"
              className={s.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="pm-totp">
              2FA-Code
            </label>
            <input
              id="pm-totp"
              className={s.input}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            />
          </div>
          <label className={s.labelRow}>
            <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
            Bestehende Passwörter überschreiben
          </label>
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
          </div>
          {error ? <div className={s.cardAlert}>{error}</div> : null}
          {info ? <div className={s.cardOk}>{info}</div> : null}
          {rows ? (
            <div className={s.tableWrap}>
              <table className={s.dataTable}>
                <thead>
                  <tr>
                    <th>LKID</th>
                    <th>Benutzername</th>
                    <th>Name</th>
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
                      <td className={s.mono}>{r.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
