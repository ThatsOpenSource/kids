export const CHILD_WORDS = [
  "Apfel","Banane","Birne","Kirsche","Erdbeere","Himbeere","Blaubeere","Pfirsich","Pflaume","Orange",
  "Zitrone","Melone","Traube","Mango","Kiwi","Ananas","Kokos","Limette","Feige","Dattel",
  "Sonne","Mond","Stern","Wolke","Regen","Schnee","Wind","Blitz","Regenbogen","Nebel",
  "Hund","Katze","Maus","Hase","Fuchs","Bär","Löwe","Tiger","Elefant","Giraffe",
  "Pinguin","Delfin","Wal","Hai","Fisch","Vogel","Adler","Eule","Ente","Schwan",
  "Baum","Blume","Rose","Tulpe","Sonnenblume","Gras","Blatt","Wald","Wiese","Berg",
  "Fluss","See","Meer","Insel","Strand","Sand","Stein","Felsen","Höhle","Tal",
  "Haus","Auto","Fahrrad","Zug","Flugzeug","Schiff","Boot","Bus","Traktor","Rakete",
  "Ball","Buch","Stift","Farbe","Musik","Tanz","Spiel","Lachen","Freund","Liebe",
  "Herz","Hand","Fuß","Auge","Nase","Mund","Ohr","Kopf","Arm","Bein",
];

export function pickChildWord(used: Set<string>): string {
  const available = CHILD_WORDS.filter(w => !used.has(w.toLowerCase()));
  if (!available.length) return CHILD_WORDS[Math.floor(Math.random() * CHILD_WORDS.length)];
  return available[Math.floor(Math.random() * available.length)];
}

export function genPupilAlnum(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const specials = ["?", "!"];
  let s = "";
  for (let i = 0; i < 7; i++) {
    if (i === 3) s += specials[Math.floor(Math.random() * specials.length)];
    else s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export function genStaff(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const specials = "#!?_-";
  let s = "";
  for (let i = 0; i < 9; i++) {
    const pool = i % 3 === 2 ? specials : chars;
    s += pool[Math.floor(Math.random() * pool.length)];
  }
  return s;
}