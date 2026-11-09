import type { PersonRole, AppFlag } from '../constants';

/** Canonical KIDS person record */
export interface Person {
  /** Internal UUID primary key – also used as AMS person_id */
  id: string;
  /** LKGREIZ_GRID from school XML */
  lkid: string;
  /** Stable UUID bound for Apple School Manager (same as id by default) */
  amsId: string;
  schulId: string;
  schulKz?: string;
  nachname: string;
  vorname: string;
  geburtsdatum: string | null;
  geschlecht?: 'm' | 'w' | 'd' | null;
  email?: string | null;
  emailMdm?: string | null;
  benutzername?: string | null;
  appleId?: string | null;
  /** plaintext only in memory after generate/reveal – DB stores AES-GCM */
  passwortPlain?: string | null;
  rollen: PersonRole[];
  klasse?: string | null;
  stufe?: string | null;
  anwendungen: AppFlag[];
  aktiverBesuch: boolean;
  terminiert: boolean;
  entityType?: 's' | 'l' | null;
  kontentyp?: number | null;
  anmerkung?: string | null;
  importId?: string | null;
  sourceGuid?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface PersonDiff {
  lkid: string;
  status: 'new' | 'changed' | 'unchanged' | 'moved' | 'dropped' | 'reactivated';
  changes?: Partial<Record<keyof Person, { from: unknown; to: unknown }>>;
  previousSchulId?: string;
}

export interface ImportPreview {
  persons: Person[];
  diffs: PersonDiff[];
  missingRequired: Array<{ lkid: string; fields: string[] }>;
  warnings: string[];
  schoolId: string;
  schoolName?: string;
  totalStudents: number;
  totalTeachers: number;
  totalOther: number;
}

/** One generated AMS export package (6 CSVs) */
export interface AmsExportPackage {
  schoolId: string;
  generatedAt: string;
  files: {
    students: string;
    staff: string;
    classes: string;
    courses: string;
    locations: string;
    rosters: string;
  };
  stats: {
    students: number;
    staff: number;
    classes: number;
    courses: number;
    locations: number;
    rosters: number;
  };
}
