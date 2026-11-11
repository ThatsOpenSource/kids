# KIDS – Kommunales Informations- und Daten-System

Vollständiges Monorepo (Prisma + Zod-Validierung) für Schülerdaten-Import, AMS-Export, Envelope-Verschlüsselung, 2FA und Konfiguration.

## Ports
- UI: **7430**
- API: **7420**
- Postgres: **7432**

## Setup
```bat
install.bat
start.bat
```
Login: `admin@kids.local` / `ChangeMeNow!23`

## Neu in diesem Stand
- `authService.ts` mit `registerUser`, `loginUser`, TOTP-Helfern (behebt den Export-Fehler)
- Auth-Middleware schützt alle `/api/*`-Routen außer `/api/auth`
- Geräte-Fingerprint wird beim ersten Login gespeichert und danach geprüft
- Schulen: Create/Edit-Modals mit Passwort-Policy (Slider + Checkboxen) und `mdmEmailDomain` / `mdmEmailPattern`
- Rollen & Flags: Create/Edit-Modals
- Schul-CSV-Import (`POST /api/schools/import-csv`) + Beispiel `samples/schools-catalogue.csv`
- Personen-Seite: Server-Pagination (`page`/`limit`) + Client-Pagination
- Erweiterte i18n-Kataloge in `src/lib/i18n.ts`

## Schema & Validierung
Prisma ist die Source of Truth. Alle Schreibzugriffe laufen über Zod-Schemas in `apps/server/src/validation/schemas.ts`.

## Beispiel-CSV für Schulen
`samples/schools-catalogue.csv` – Spalten: `sid,sgid,name,schoolType`