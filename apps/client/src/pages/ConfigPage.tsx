import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import s from '../styles/shared.module.css';

const emptyPolicy = {
  length: 12,
  includeUpper: true,
  includeLower: true,
  includeDigits: true,
  includeSpecial: false,
  specialChars: '!@#$%&*',
  strength: 'medium' as const,
  wordPool: '',
  wordCount: 2,
  derivePattern: '',
  deriveDigitCount: 2,
  prefix: '',
};

export default function ConfigPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [umlautMode, setUmlautMode] = useState<'ae' | 'strip'>('ae');
  const [assignAll, setAssignAll] = useState(true);
  const [appleDomain, setAppleDomain] = useState('appleid.ds-greiz.de');
  const [policy, setPolicy] = useState({ ...emptyPolicy });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.listSchools().then((r) => setSchools(r.schools)).catch(() => {});
  }, []);

  useEffect(() => {
    const sc = schools.find((x) => x.id === selected);
    if (sc?.config) {
      setUmlautMode(sc.config.umlautMode || 'ae');
      setAssignAll(sc.config.assignAllTeachersToClasses !== false);
      setAppleDomain(sc.config.appleIdDomain || 'appleid.ds-greiz.de');
      setPolicy({ ...emptyPolicy, ...(sc.config.passwordPolicy || {}) });
    }
  }, [selected, schools]);

  async function save() {
    if (!selected) return;
    setMsg('');
    try {
      await api.updateSchoolConfig(selected, {
        umlautMode,
        assignAllTeachersToClasses: assignAll,
        appleIdDomain: appleDomain,
        passwordPolicy: {
          length: Number(policy.length) || 12,
          includeUpper: !!policy.includeUpper,
          includeLower: !!policy.includeLower,
          includeDigits: !!policy.includeDigits,
          includeSpecial: !!policy.includeSpecial,
          specialChars: policy.specialChars || undefined,
          strength: policy.strength,
          wordPool: policy.wordPool || undefined,
          wordCount: Number(policy.wordCount) || 2,
          derivePattern: policy.derivePattern || undefined,
          deriveDigitCount: Number(policy.deriveDigitCount) || 0,
          prefix: policy.prefix || undefined,
        },
      });
      setMsg('Gespeichert.');
      const r = await api.listSchools();
      setSchools(r.schools);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : 'Fehler');
    }
  }

  function setP<K extends keyof typeof policy>(key: K, value: (typeof policy)[K]) {
    setPolicy((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>Konfiguration</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>Schulregeln: Umlaute, Klassenlehrer-Policy, Passwort-Regeln.</p>

        <div className={s.cardWide}>
          <div className={s.field}>
            <label className={s.label} htmlFor="cfg-school">
              Schule
            </label>
            <select
              id="cfg-school"
              className={s.select}
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">— wählen —</option>
              {schools.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} ({sc.id})
                </option>
              ))}
            </select>
          </div>

          {selected ? (
            <>
              <h3 className={s.heading}>Allgemein</h3>
              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-umlaut">
                  Umlaut-Modus
                </label>
                <select
                  id="cfg-umlaut"
                  className={s.select}
                  value={umlautMode}
                  onChange={(e) => setUmlautMode(e.target.value as 'ae' | 'strip')}
                >
                  <option value="ae">ä→ae, ö→oe, ü→ue, ß→ss</option>
                  <option value="strip">ä→a, ö→o, ü→u, ß→s</option>
                </select>
              </div>

              <label className={s.labelRow}>
                <input
                  type="checkbox"
                  checked={assignAll}
                  onChange={(e) => setAssignAll(e.target.checked)}
                />
                Alle Lehrer allen Klassen zuordnen
              </label>

              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-apple">
                  Apple-ID Domain
                </label>
                <input
                  id="cfg-apple"
                  className={s.input}
                  value={appleDomain}
                  onChange={(e) => setAppleDomain(e.target.value)}
                />
              </div>

              <h3 className={s.headingSpaced}>Passwort-Regeln</h3>
              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-strength">
                  Stärke
                </label>
                <select
                  id="cfg-strength"
                  className={s.select}
                  value={policy.strength}
                  onChange={(e) => setP('strength', e.target.value as typeof policy.strength)}
                >
                  <option value="weak">weak (8)</option>
                  <option value="medium">medium (12)</option>
                  <option value="strong">strong (16)</option>
                </select>
              </div>

              <label className={s.label}>Länge: {policy.length}</label>
              <input
                className={s.range}
                type="range"
                min={8}
                max={32}
                value={policy.length}
                onChange={(e) => setP('length', Number(e.target.value))}
              />

              <div className={s.grid2}>
                <label className={s.labelRow}>
                  <input
                    type="checkbox"
                    checked={policy.includeUpper}
                    onChange={(e) => setP('includeUpper', e.target.checked)}
                  />
                  Großbuchstaben
                </label>
                <label className={s.labelRow}>
                  <input
                    type="checkbox"
                    checked={policy.includeLower}
                    onChange={(e) => setP('includeLower', e.target.checked)}
                  />
                  Kleinbuchstaben
                </label>
                <label className={s.labelRow}>
                  <input
                    type="checkbox"
                    checked={policy.includeDigits}
                    onChange={(e) => setP('includeDigits', e.target.checked)}
                  />
                  Ziffern
                </label>
                <label className={s.labelRow}>
                  <input
                    type="checkbox"
                    checked={policy.includeSpecial}
                    onChange={(e) => setP('includeSpecial', e.target.checked)}
                  />
                  Sonderzeichen
                </label>
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-special">
                  Sonderzeichen-Satz
                </label>
                <input
                  id="cfg-special"
                  className={s.input}
                  value={policy.specialChars}
                  onChange={(e) => setP('specialChars', e.target.value)}
                />
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-prefix">
                  Prefix
                </label>
                <input
                  id="cfg-prefix"
                  className={s.input}
                  value={policy.prefix}
                  onChange={(e) => setP('prefix', e.target.value)}
                />
              </div>

              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-pool">
                  Wortliste
                </label>
                <textarea
                  id="cfg-pool"
                  className={s.textarea}
                  rows={3}
                  value={policy.wordPool}
                  onChange={(e) => setP('wordPool', e.target.value)}
                />
              </div>

              <label className={s.label}>Wörter: {policy.wordCount}</label>
              <input
                className={s.range}
                type="range"
                min={1}
                max={6}
                value={policy.wordCount}
                onChange={(e) => setP('wordCount', Number(e.target.value))}
              />

              <div className={s.field}>
                <label className={s.label} htmlFor="cfg-derive">
                  Ableitungsmuster
                </label>
                <input
                  id="cfg-derive"
                  className={s.input}
                  value={policy.derivePattern}
                  onChange={(e) => setP('derivePattern', e.target.value)}
                  placeholder="{vorname3}{nachname3}{digit}"
                />
              </div>

              <label className={s.label}>Zufalls-Ziffern: {policy.deriveDigitCount}</label>
              <input
                className={s.range}
                type="range"
                min={0}
                max={6}
                value={policy.deriveDigitCount}
                onChange={(e) => setP('deriveDigitCount', Number(e.target.value))}
              />

              <button type="button" className={s.btnPrimary} onClick={save}>
                Speichern
              </button>
              {msg ? <p className={s.mt}>{msg}</p> : null}
            </>
          ) : null}
        </div>

        <div className={s.cardWide}>
          <h3 className={s.heading}>Import-Verhalten</h3>
          <ul className={s.list}>
            <li>Bestehende Benutzernamen, Namen, IDs bleiben unverändert.</li>
            <li>Aktualisiert: Schule, Klasse, Stufe, Rollen, Flags, aktiv/terminiert.</li>
            <li>Neue Personen: eindeutige Benutzernamen (DB-geprüft).</li>
          </ul>
          <h3 className={s.headingSpaced}>Flags</h3>
          <p className={s.muted}>
            <code>sg-mdm</code> · <code>sg-cloud</code> · <code>sp-prt</code> · <code>sp-iot</code>
          </p>
        </div>
      </div>
    </div>
  );
}
