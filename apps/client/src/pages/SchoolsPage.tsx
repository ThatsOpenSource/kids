import { useEffect, useState, FormEvent } from 'react';
import { api } from '../lib/api';
import s from '../styles/shared.module.css';

const emptyForm = {
  id: '',
  code: '',
  kzSnr: '',
  name: '',
  type: 'gymnasium' as const,
  location: '',
  active: true,
};

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api.listSchools();
    setSchools(r.schools);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startEdit(sc: any) {
    setEditId(sc.id);
    setForm({
      id: sc.id,
      code: sc.code || '',
      kzSnr: sc.kzSnr || '',
      name: sc.name || '',
      type: sc.type || 'sonstige',
      location: sc.location || '',
      active: sc.active !== false,
    });
    setMsg('');
    setError('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm({ ...emptyForm });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        id: form.id.trim(),
        code: form.code.trim(),
        kzSnr: form.kzSnr.trim() || null,
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim() || null,
        active: form.active,
      };
      if (editId) {
        await api.updateSchool(editId, {
          code: payload.code,
          kzSnr: payload.kzSnr,
          name: payload.name,
          type: payload.type,
          location: payload.location,
          active: payload.active,
        });
        setMsg('Schule aktualisiert.');
      } else {
        await api.createSchool(payload);
        setMsg('Schule angelegt.');
      }
      cancelEdit();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>Schulen</h2>
      </header>
      <div className={s.pageBody}>
        <p className={s.muted}>
          Schulnummer = technische ID (z. B. 50267). KZ-OU = Kurzcode (z. B. gym-gsdg). KZ-SNr =
          Index für STO-Gruppen (z. B. 45 → „45-Lehrer“, „45-Schueler“). STO-Felder werden nicht
          gespeichert, sondern bei Export/Anzeige aus KZ-SNr + Rolle/Klasse gebildet.
        </p>

        <form className={s.cardWide} onSubmit={onSubmit}>
          <h3 className={s.heading}>{editId ? `Schule bearbeiten (${editId})` : 'Schule anlegen'}</h3>
          <div className={s.grid2}>
            <div className={s.field}>
              <label className={s.label} htmlFor="sch-id">
                Schulnummer * (ID)
              </label>
              <input
                id="sch-id"
                className={s.input}
                value={form.id}
                onChange={(e) => setField('id', e.target.value)}
                required
                disabled={!!editId}
                pattern="[0-9]+"
                title="Nur Ziffern"
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="sch-code">
                KZ-OU * (code)
              </label>
              <input
                id="sch-code"
                className={s.input}
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                required
                placeholder="gym-gsdg"
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="sch-kzsnr">
                KZ-SNr (optional)
              </label>
              <input
                id="sch-kzsnr"
                className={s.input}
                value={form.kzSnr}
                onChange={(e) => setField('kzSnr', e.target.value)}
                placeholder="45"
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="sch-type">
                Schulart *
              </label>
              <select
                id="sch-type"
                className={s.select}
                value={form.type}
                onChange={(e) => setField('type', e.target.value as typeof form.type)}
              >
                <option value="grundschule">Grundschule</option>
                <option value="regelschule">Regelschule</option>
                <option value="gymnasium">Gymnasium</option>
                <option value="sonstige">Sonstige</option>
              </select>
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="sch-name">
              Name *
            </label>
            <input
              id="sch-name"
              className={s.input}
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              required
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="sch-loc">
              Ort (optional)
            </label>
            <input
              id="sch-loc"
              className={s.input}
              value={form.location}
              onChange={(e) => setField('location', e.target.value)}
            />
          </div>
          <label className={s.labelRow}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setField('active', e.target.checked)}
            />
            Aktiv
          </label>
          <div className={s.btnRow}>
            <button type="submit" className={s.btnPrimary} disabled={busy}>
              {editId ? 'Speichern' : 'Anlegen'}
            </button>
            {editId ? (
              <button type="button" className={s.btn} onClick={cancelEdit}>
                Abbrechen
              </button>
            ) : null}
          </div>
          {msg ? <p className={s.mt}>{msg}</p> : null}
          {error ? <div className={`${s.cardAlert} ${s.mt}`}>{error}</div> : null}
        </form>

        <div className={s.tableWrap}>
          <table className={s.dataTable}>
            <thead>
              <tr>
                <th>Schulnummer</th>
                <th>KZ-OU</th>
                <th>KZ-SNr</th>
                <th>Name</th>
                <th>Art</th>
                <th>Ort</th>
                <th>AMS location</th>
                <th>Aktiv</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {schools.map((sc) => (
                <tr key={sc.id}>
                  <td className={s.mono}>{sc.id}</td>
                  <td className={s.mono}>{sc.code}</td>
                  <td className={s.mono}>{sc.kzSnr || '—'}</td>
                  <td>{sc.name}</td>
                  <td>
                    <span className={s.chip}>{sc.type}</span>
                  </td>
                  <td>{sc.location || '—'}</td>
                  <td className={s.monoSmall}>{sc.amsLocationId}</td>
                  <td>{sc.active ? 'ja' : 'nein'}</td>
                  <td>
                    <button type="button" className={s.btn} onClick={() => startEdit(sc)}>
                      Bearbeiten
                    </button>
                  </td>
                </tr>
              ))}
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={9} className={s.muted}>
                    Noch keine Schulen.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
