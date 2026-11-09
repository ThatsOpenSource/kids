import { XMLParser } from 'fast-xml-parser';
import {
  PERSON_ROLES,
  ACCOUNT_TYPES,
  type Person,
  parseGermanDate,
  generateUsername,
} from '@kids/shared';
import { logger } from '../utils/logger';

interface RawField {
  '@_tablename'?: string;
  '@_fieldname'?: string;
  '@_value'?: string;
  tablename?: string;
  fieldname?: string;
  value?: string;
  '#text'?: string;
}

interface RawObject {
  field?: RawField | RawField[];
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function fieldMap(obj: RawObject | Record<string, unknown>): Record<string, string> {
  const map: Record<string, string> = {};
  const fields = asArray((obj as RawObject).field);
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    const name = (f['@_fieldname'] ?? f.fieldname ?? '').toString();
    let value = f['@_value'] ?? f.value ?? f['#text'] ?? '';
    if (name) map[name] = String(value ?? '');
  }
  return map;
}

/** Collect all <object> nodes from one or many <dataset> elements */
function collectObjects(parsed: any): RawObject[] {
  const root = parsed?.data ?? parsed;
  if (!root) return [];
  const datasets = asArray(root.dataset);
  const objects: RawObject[] = [];
  for (const ds of datasets) {
    if (!ds) continue;
    objects.push(...asArray(ds.object));
  }
  // Some exports nest objects under dataset.basedata etc.
  if (objects.length === 0 && root.object) {
    objects.push(...asArray(root.object));
  }
  return objects;
}

export interface ParseResult {
  schoolId: string;
  datatype: string;
  persons: Partial<Person>[];
  warnings: string[];
}

export function parseSchoolXml(xmlContent: string): ParseResult {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    // Keep empty attributes
    allowBooleanAttributes: true,
  });

  let parsed: any;
  try {
    parsed = parser.parse(xmlContent);
  } catch (err) {
    logger.error('XML parse failed', { err: String(err) });
    throw new Error('XML ist ungültig oder beschädigt');
  }

  const data = parsed?.data;
  if (!data) {
    // Diagnostic: top-level keys
    logger.error('XML root keys', { keys: Object.keys(parsed || {}) });
    throw new Error('Kein <data> Root-Element gefunden');
  }

  const schoolId = String(data['@_originlocation'] ?? data.originlocation ?? '').trim();
  const datatype = String(data['@_datatype'] ?? data.datatype ?? '').trim();
  const objects = collectObjects(parsed);
  const warnings: string[] = [];
  const persons: Partial<Person>[] = [];
  const usedUsernames = new Set<string>();

  if (objects.length === 0) {
    warnings.push('Keine <object>-Einträge im XML gefunden');
    logger.warn('XML had zero objects', {
      schoolId,
      datatype,
      datasetType: Array.isArray(data.dataset) ? 'array' : typeof data.dataset,
    });
  }

  for (const obj of objects) {
    const f = fieldMap(obj);
    const lkid = (f.LKGREIZ_GRID || f.LK_GREIZ_GRID || '').trim();
    if (!lkid) {
      warnings.push(`Objekt ohne LKGREIZ_GRID übersprungen (GUID=${f.GUID ?? f.PLID ?? '?'})`);
      continue;
    }

    const entity = (f.ENTITYTYPE || f.ENTITY_TYPE || '').toLowerCase().trim();
    // Prefer ENTITYTYPE; fall back to file datatype
    const isTeacher =
      entity === 'l' ||
      entity === 'lehrer' ||
      (!entity && (datatype.includes('T11000') || datatype === 'T11000'));
    const isStudent =
      entity === 's' ||
      entity === 'schueler' ||
      entity === 'schüler' ||
      (!entity && !isTeacher && (datatype.includes('T45000') || datatype === 'T45000'));

    let rollen: string[];
    let kontentyp: number;
    if (isTeacher && !isStudent) {
      rollen = [PERSON_ROLES.LEHRER];
      kontentyp = ACCOUNT_TYPES.LEHRER;
    } else if (isStudent) {
      rollen = [PERSON_ROLES.SCHUELER];
      kontentyp = ACCOUNT_TYPES.SCHUELER;
    } else if (isTeacher) {
      // both flags – treat as teacher only if entity is l
      rollen = [PERSON_ROLES.LEHRER];
      kontentyp = ACCOUNT_TYPES.LEHRER;
    } else {
      rollen = [PERSON_ROLES.SONSTIGE];
      kontentyp = ACCOUNT_TYPES.SONSTIGE;
    }

    // Datatype-only force for pure staff files
    if (datatype.includes('T11000') && entity === 'l') {
      rollen = [PERSON_ROLES.LEHRER];
      kontentyp = ACCOUNT_TYPES.LEHRER;
    }
    if (datatype.includes('T45000') && entity === 's') {
      rollen = [PERSON_ROLES.SCHUELER];
      kontentyp = ACCOUNT_TYPES.SCHUELER;
    }

    const nachname = (f.NNAME || '').trim();
    const vorname = (f.VNAME || '').trim();
    if (!nachname || !vorname) {
      warnings.push(`LKID ${lkid}: Nachname oder Vorname fehlt`);
      // still import if we have at least one name part
      if (!nachname && !vorname) continue;
    }

    const geburtsdatum = parseGermanDate(f.GEBDAT);
    const schoolEntryDate = parseGermanDate(f.SCHULBEG);
    const schoolEndDate = parseGermanDate(f.SCHULEND);
    const klasse = (f.KL || f.SHORT1 || '').trim() || null;
    const stufe = (f.STUFE || '').trim() || null;
    const email = (f.EMAIL || '').trim() || null;
    const entlassen = (f.ENTLASSEN || 'n').toLowerCase() === 'j';
    const mdmState = (f.MDMSTATE || '').toLowerCase();

    let benutzername: string | undefined;
    if (nachname && vorname) {
      benutzername = generateUsername(vorname, nachname, 'ae', usedUsernames);
      usedUsernames.add(benutzername);
    }

    const person: Partial<Person> = {
      lkid,
      schulId: (f.SNR || schoolId || '').trim(),
      nachname: nachname || '—',
      vorname: vorname || '—',
      geburtsdatum,
      schoolEntryDate,
      schoolEndDate,
      geschlecht: (f.GESCHL as 'm' | 'w' | 'd') || null,
      email: email || null,
      benutzername,
      rollen: rollen as Person['rollen'],
      klasse,
      stufe,
      anwendungen: mdmState === 'j' ? ['sg-mdm'] : [],
      aktiverBesuch: !entlassen,
      terminiert: entlassen,
      kontentyp,
      sourceGuid: f.GUID || f.PLID || null,
      version: 1,
    };

    persons.push(person);
  }

  logger.info('XML parsed', {
    schoolId,
    datatype,
    objectCount: objects.length,
    count: persons.length,
    warnings: warnings.length,
  });

  return { schoolId, datatype, persons, warnings };
}

export function assertSingleXml(content: string): void {
  const trimmed = content.trim().replace(/^\uFEFF/, '');
  if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<data')) {
    throw new Error('Inhalt ist kein XML');
  }
  if (trimmed.includes('<html') || trimmed.includes('<!DOCTYPE html')) {
    throw new Error('HTML statt XML erkannt');
  }
}
