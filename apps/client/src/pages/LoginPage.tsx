import { useState, FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/authStore';
import styles from './LoginPage.module.css';

type Phase = 'credentials' | 'totp' | 'setup';

export default function LoginPage() {
  const { user, loginPassword, finishTotp, finishSetup } = useAuth();
  const [phase, setPhase] = useState<Phase>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [preAuth, setPreAuth] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (phase === 'credentials') {
        const res = await loginPassword(email, password);
        if (res.requiresTotp && res.preAuthToken) {
          setPreAuth(res.preAuthToken);
          setPhase('totp');
          setCode('');
        } else if (res.requiresTotpSetup && res.setupToken) {
          setSetupToken(res.setupToken);
          setQr(res.qrDataUrl || null);
          setSecret(res.secret || '');
          setPhase('setup');
          setCode('');
        }
      } else if (phase === 'totp' && preAuth) {
        await finishTotp(preAuth, code);
      } else if (phase === 'setup' && setupToken) {
        await finishSetup(setupToken, code);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setPhase('credentials');
    setPreAuth(null);
    setSetupToken(null);
    setQr(null);
    setSecret('');
    setCode('');
    setError('');
  }

  const title =
    phase === 'credentials' ? 'KIDS' : phase === 'totp' ? 'Zwei-Faktor' : '2FA einrichten';
  const sub =
    phase === 'credentials'
      ? 'Anmelden'
      : phase === 'totp'
        ? 'Code aus der Authenticator-App'
        : 'Vor dem ersten Zugang muss 2FA eingerichtet werden. QR scannen, dann Code bestätigen.';

  return (
    <div className={styles.shell}>
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
        {error ? <div className={styles.error}>{error}</div> : null}

        {phase === 'credentials' ? (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                E-Mail
              </label>
              <input
                id="email"
                className={styles.input}
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Passwort
              </label>
              <input
                id="password"
                className={styles.input}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
          </>
        ) : null}

        {phase === 'setup' ? (
          <>
            {qr ? <img className={styles.qr} src={qr} alt="TOTP QR-Code" width={200} height={200} /> : null}
            {secret ? <p className={styles.secret}>Secret: {secret}</p> : null}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="setup-code">
                Bestätigungscode
              </label>
              <input
                id="setup-code"
                className={styles.input}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                minLength={6}
                autoFocus
              />
            </div>
          </>
        ) : null}

        {phase === 'totp' ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="totp">
              Authenticator-Code
            </label>
            <input
              id="totp"
              className={styles.input}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              required
              minLength={6}
              autoFocus
            />
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="submit" className={styles.btnPrimary} disabled={busy}>
            {busy
              ? '…'
              : phase === 'credentials'
                ? 'Weiter'
                : phase === 'setup'
                  ? '2FA aktivieren & anmelden'
                  : 'Anmelden'}
          </button>
          {phase !== 'credentials' ? (
            <button type="button" className={styles.btn} onClick={back}>
              Zurück
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
