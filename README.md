# KIDS — Kommunales Informations- und Datensystem für Schuldaten

Verwaltung von Schüler- und Lehrerdaten für den Landkreis Greiz. TypeScript-Monorepo mit React/Vite-Client und Express/Prisma-Server.

## Voraussetzungen

- Bun
- Docker (Postgres)
- Windows 11 oder vergleichbar

## Start

```bat
docker compose up -d
cd apps\server
bun install
bunx prisma db push
bun run seed
bun run dev
```

Client in zweitem Terminal:

```bat
cd apps\client
bun install
bun run dev
```

- Client: http://localhost:7430
- Server: http://localhost:7420
- Postgres: localhost:7432

## Anmeldung

Standard: `admin@kids.local` / `ChangeMe123!`

Beim ersten Login muss das Passwort geändert und 2FA eingerichtet werden. Danach ist bei jedem Login ein 2FA-Code erforderlich, außer „Für 1 Tag merken“ ist aktiv.

## Funktionen

- **Personen** — Tabelle mit Filtern, Sortierung, Mehrfachauswahl, Passwort-Generierung, Detail-/Edit-Dialog
- **Import** — XML (LuL/SuS) mit Vorschau, Vergleich und Schul-Lookup
- **Schulen** — CRUD, Typ-Konfiguration, CSV-Import
- **Export** — ASM und CSV mit Passwort-Bestätigung
- **Regeln** — Passwort-Regeln pro Rolle/Schule
- **Konfiguration** — Rollen, Flags, Gruppen-Flags
- **Benutzer** — Verwaltung, 2FA, Passwort
- **Historie** — Änderungsprotokoll

## Verschlüsselung

Sensible Felder (Name, Vorname, E-Mail, Benutzername, LKID, Apple ID, System-E-Mail, Passwort) werden mit Envelope-Verschlüsselung gespeichert. Lookup-Hashes ermöglichen Suche ohne Entschlüsselung. Schlüsselrotation alle 120 Tage.

## Umgebung

`.env` im Root und `apps/server`:

```
DATABASE_URL=postgresql://kids:kids@localhost:7432/kids
ENCRYPTION_MASTER_KEY=...
PASSWORD_PEPPER=...
ADMIN_EMAIL=admin@kids.local
ADMIN_PASSWORD=ChangeMe123!
JWT_SECRET=...
JWT_REFRESH_SECRET=...
```
