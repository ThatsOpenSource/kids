import { useState, useEffect } from "react";
import { api, asArray } from "../lib/api";
import DataTable from "../components/DataTable";
import Button from "../components/Button";
import s from "../styles/page.module.css";

const WORD_LIST = [
  "Apfel","Banane","Birne","Kirsche","Sonne","Mond","Stern","Wolke","Blume","Baum",
  "Hund","Katze","Maus","Vogel","Fisch","Pferd","Ziege","Schaf","Ente","Hase",
  "Bär","Löwe","Tiger","Zebra","Affe","Wal","Hai","Frosch","Biene","Ameise",
  "Spinne","Käfer","Wurm","Auto","Bus","Zug","Schiff","Ball","Buch","Stift",
  "Papier","Schere","Farbe","Kreide","Tafel","Stuhl","Tisch","Bett","Lampe","Tür",
  "Dach","Wand","Boden","Garten","Park","Schule","Klasse","Lehrer","Freund","Mama",
  "Papa","Oma","Opa","Bruder","Baby","Kind","Junge","Haus","Zimmer","Küche",
  "Bad","Spiel","Lachen","Singen","Tanzen","Malen","Lesen","Reiten","Schwimmen","Laufen",
  "Springen","Klettern","Schaukel","Rutsche","Sandkasten","Puppe","Teddy","Roboter","Rakete","Mond",
  "Planet","Galaxie","Zauber","Fee","Drache","Ritter","Prinzessin","Schloss","Burg","Turm",
].join(" ");

interface Override { id: string; schoolId: string; roleId: string; length: number; special: boolean; wordList: boolean; }

export default function Ruleset() {
  const [words, setWords] = useState(WORD_LIST);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [form, setForm] = useState({ schoolId: "", roleId: "", length: 7, special: true, wordList: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/api/config/rules").then(d => { if (d.words) setWords(d.words); if (d.overrides) setOverrides(d.overrides); }).catch(() => {});
    api("/api/schools").then(d => setSchools(asArray(d))).catch(() => {});
    api("/api/config/roles").then(d => setRoles(asArray(d))).catch(() => {});
  }, []);

  async function save() {
    await api("/api/config/rules", { method: "PUT", body: JSON.stringify({ words, overrides }) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addOverride() {
    if (!form.schoolId && !form.roleId) return;
    setOverrides([...overrides, { ...form, id: crypto.randomUUID() }]);
    setForm({ schoolId: "", roleId: "", length: 7, special: true, wordList: false });
  }

  function removeOverride(id: string) {
    setOverrides(overrides.filter(o => o.id !== id));
  }

  const rows = overrides.map(o => ({
    ...o,
    school: schools.find(sc => sc.id === o.schoolId)?.name || "Alle",
    role: roles.find(r => r.id === o.roleId)?.label || "Alle",
  }));

  return (
    <div className={s.page}>
      <header className={s.toolbar}><h2 className={s.title}>Passwort-Regeln</h2></header>
      <div className={s.scroll}>
        <h3>Standardregeln (nicht änderbar)</h3>
        <div className={s.section}><strong>Grundschule Schüler</strong><p className={s.muted}>6 Zeichen, Wort aus Liste, gleiches Passwort pro Klasse</p></div>
        <div className={s.section}><strong>Andere Schüler</strong><p className={s.muted}>7 Zeichen alphanumerisch, Sonderzeichen (? oder !) an 4. Stelle, einzigartig pro Klasse</p></div>
        <div className={s.section}><strong>Personal</strong><p className={s.muted}>9 Zeichen aus Zahlen, Buchstaben, Sonderzeichen (#!?_-)</p></div>

        <h3 className={s.mt}>Wortliste ({words.split(/\s+/).filter(Boolean).length} Wörter)</h3>
        <textarea className={"search-input " + s.field} value={words} onChange={e => setWords(e.target.value)} rows={6} />

        <h3 className={s.mt}>Überschreibungen</h3>
        <p className={s.muted}>Spezifische Regeln für Schule und/oder Rolle überschreiben die Standards.</p>
        <div className={s.row}>
          <select className="search-input" value={form.schoolId} onChange={e => setForm({ ...form, schoolId: e.target.value })}>
            <option value="">Alle Schulen</option>
            {schools.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
          <select className="search-input" value={form.roleId} onChange={e => setForm({ ...form, roleId: e.target.value })}>
            <option value="">Alle Rollen</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <input type="number" className="search-input" value={form.length} onChange={e => setForm({ ...form, length: +e.target.value })} min={4} max={16} />
          <label className={s.check + (form.special ? " " + s.checkOn : "")}>
            <input type="checkbox" checked={form.special} onChange={e => setForm({ ...form, special: e.target.checked })} /> Sonderzeichen
          </label>
          <label className={s.check + (form.wordList ? " " + s.checkOn : "")}>
            <input type="checkbox" checked={form.wordList} onChange={e => setForm({ ...form, wordList: e.target.checked })} /> Wortliste
          </label>
          <Button variant="primary" onClick={addOverride}>Hinzufügen</Button>
        </div>
        <DataTable columns={[
          { key: "school", label: "Schule" }, { key: "role", label: "Rolle" }, { key: "length", label: "Länge" },
          { key: "special", label: "Sonderzeichen", render: (r: any) => r.special ? "Ja" : "Nein" },
          { key: "wordList", label: "Wortliste", render: (r: any) => r.wordList ? "Ja" : "Nein" },
          { key: "actions", label: "", render: (r: any) => <Button variant="small" onClick={() => removeOverride(r.id)}>Entfernen</Button> },
        ]} rows={rows} rowKey="id" />

        <div className={s.mt}>
          <Button variant="primary" onClick={save}>Speichern</Button>
          {saved && <span className={s.muted}>Gespeichert</span>}
        </div>
      </div>
    </div>
  );
}