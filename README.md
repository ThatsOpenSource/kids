# KIDS – Kommunales Informations- und Daten-System für Schülerdaten

TypeScript React Vite monorepo (Bun) with **Prisma** schema, **Zod** request validation, AMS export, and field-level encryption.

## Architecture

```
kids-monorepo/
├── apps/
│   ├── client/                 # React + Vite + JSZip
│   └── server/
│       ├── prisma/schema.prisma   # DB source of truth
│       ├── src/validation/        # Zod schemas for all user input
│       ├── src/middleware/validate.ts
│       └── src/db/prisma.ts       # PrismaClient singleton
├── packages/shared/
├── docker-compose.yml
└── README.md
```

## Setup

```bash
export PATH="/root/.bun/bin:$PATH"
cd /home/workdir/artifacts/kids-monorepo

bun install
docker compose up -d

# Prisma: generate client + push schema to Postgres
cd apps/server
cp ../../.env.example .env   # ensure DATABASE_URL is set
bunx prisma generate
bunx prisma db push
bun src/scripts/seedAdmin.ts
bun src/scripts/seedSchools.ts
cd ../..

bun run dev:server    # :4000
bun run dev:client    # :5173
```

### DB commands

```bash
cd apps/server
bunx prisma generate          # regenerate client after schema change
bunx prisma db push           # sync schema (dev)
bunx prisma migrate dev       # named migration (preferred for prod)
bunx prisma migrate deploy    # apply migrations in prod
bunx prisma studio            # GUI
bun run db:seed               # admin + sample school
```

From monorepo root:

```bash
bun run db:generate
bun run db:push
bun run db:seed
```

## Validation layers

1. **HTTP (Zod)** – `validate(schema)` middleware on every write/query route  
   - Auth: email/password rules, device fingerprint  
   - Import: Base64 size limits, filename, person field constraints  
   - Commit: each person re-validated with `personCommitSchema` before DB write  
   - Schools / AMS: typed config, domain format, enums  

2. **Prisma** – types + constraints (unique `lkid`, `amsId`, FKs, enums `AppUserRole` / `SchoolType`)

3. **Application** – AES-GCM encryption of PII before persist; bcrypt for passwords

Invalid input returns `400` with structured `details: [{ path, message }]`.

## AMS IDs

- `persons.ams_id` (UUID) → AMS `person_id`  
- `persons.lkid` → AMS `person_number`  
- `schools.ams_location_id` (UUID) → AMS `location_id`

## Flags

`sg-mdm` · `sg-cloud` · `sp-prt` (PaperCut; replaces legacy column `sg-prt`) · `sp-iot`

## Default login

`admin@kids.local` / `ChangeMeNow!23`
