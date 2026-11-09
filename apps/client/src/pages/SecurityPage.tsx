import { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authStore';
import s from '../styles/shared.module.css';

export default function SecurityPage() {
  const { totpEnabled, setTotpEnabled } = useAuth();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const res = await api.setup2fa();
      setQr(res.qrDataUrl);
      setSecret(res.secret);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      await api.confirm2fa(code);
      setTotpEnabled(true);
      setQr(null);
      setSecret('');
      setCode('');
      setMsg('2FA ist aktiv (bzw. erfolgreich ersetzt).');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>Sicherheit / 2FA</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>
          TOTP ist Pflicht. Deaktivieren ist nicht möglich – nur erfolgreiches Ersetzen durch ein
          neues Gerät/Secret.
        </p>

        <div className={s.cardNarrow}>
          <p className={s.muted}>
            Status:{' '}
            {totpEnabled ? (
              <span className={s.chip}>2FA aktiv</span>
            ) : (
              <span className={s.chipWarn}>2FA nicht aktiv</span>
            )}
          </p>

          {!qr ? (
            <button type="button" className={s.btnPrimary} disabled={busy} onClick={startSetup}>
              {totpEnabled ? '2FA neu einrichten (ersetzen)' : '2FA einrichten (QR-Code)'}
            </button>
          ) : null}

          {qr ? (
            <div className={s.section}>
              <p className={s.muted}>QR-Code scannen, dann 6-stelligen Code eingeben:</p>
              <img className={s.qr} src={qr} alt="TOTP QR-Code" width={200} height={200} />
              <p className={s.secretBox}>Secret: {secret}</p>
              <div className={s.field}>
                <label className={s.label} htmlFor="sec-code">
                  Code
                </label>
                <input
                  id="sec-code"
                  className={s.input}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </div>
              <button
                type="button"
                className={s.btnPrimary}
                disabled={busy || code.length < 6}
                onClick={confirm}
              >
                Bestätigen
              </button>
            </div>
          ) : null}

          {msg ? <p className={s.mt}>{msg}</p> : null}
          {error ? <div className={`${s.cardAlert} ${s.mt}`}>{error}</div> : null}
        </div>
      </div>
    </div>
  );
}
