# Person encryption migration

## Fresh database

```bash
cd apps/server
bunx prisma db push
bun src/scripts/seedAdmin.ts
bun src/scripts/seedSchools.ts
```

## Existing legacy schema (`nachname_enc`, `schul_id`, …)

```bash
cd apps/server
# 1) Rename old table (script detects legacy and renames)
bun src/scripts/migratePersonSchema.ts
# 2) Create new columns/tables
bunx prisma db push
# 3) Copy + re-encrypt rows, drop legacy
bun src/scripts/migratePersonSchema.ts
```

## Uniqueness

| Constraint | Mechanism |
|------------|-----------|
| Person LKID | `lkid_hash` UNIQUE |
| AMS id | `ams_id_hash` UNIQUE |
| Username | `username_hash` UNIQUE |
| School id | `schools.id` PK |
| School code | `schools.code` UNIQUE |

Grades/classes are **not** unique per person; multiple pupils share a class.

## kontentyp / entity_type

Removed from DB. Derived from `roles` via `rolesToAccountType()` (431/411/421).
