import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import s from '../styles/shared.module.css';

export default function DashboardPage() {
  const [schools, setSchools] = useState(0);
  const [persons, setPersons] = useState(0);

  useEffect(() => {
    api.listSchools().then((r) => setSchools(r.schools.length)).catch(() => {});
    api.listPersons({}).then((r) => setPersons(r.total)).catch(() => {});
  }, []);

  return (
    <div className={s.page}>
      <header className={s.toolbar}>
        <h2 className={s.toolbarTitle}>Übersicht</h2>
        <span className={s.toolbarSpacer} />
        <span className={s.chip}>{schools} Schulen</span>
        <span className={s.chip}>{persons} Personen</span>
      </header>
      <div className={s.pageBody}>
        <div className={s.card}>
          <p className={s.muted}>
            Schul-XML importieren, Personen verwalten, AMS- und CSV-Exporte.
          </p>
          <ol className={s.list}>
            <li>
              <Link to="/import">ZIP mit XML importieren</Link>
            </li>
            <li>Vorschau prüfen, Commit</li>
            <li>
              <Link to="/persons">Personen</Link> · <Link to="/export">CSV</Link> ·{' '}
              <Link to="/ams">AMS</Link>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
