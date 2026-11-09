export interface PasswordPolicyConfig {
  length?: number; // 8–64
  includeUpper?: boolean;
  includeLower?: boolean;
  includeDigits?: boolean;
  includeSpecial?: boolean;
  specialChars?: string;
  /** Optional fixed prefix */
  prefix?: string;
  /** Strength hint: weak | medium | strong (drives defaults if length omitted) */
  strength?: 'weak' | 'medium' | 'strong';
  /**
   * Word pool (space/newline separated). When non-empty, passwords are built
   * from N random words (+ optional digit/special suffix).
   */
  wordPool?: string;
  wordCount?: number; // 1–6
  /**
   * Derive local-part from person fields.
   * Tokens: {vorname}, {vorname3}, {nachname}, {nachname3}, {klasse}, {stufe}, {lkid}
   * Example: "{vorname3}{nachname3}{digit}"
   */
  derivePattern?: string;
  /** Append random digits to derived passwords for uniqueness */
  deriveDigitCount?: number;
}

export interface SchoolConfig {
  passwordPolicy?: PasswordPolicyConfig;
  usernamePattern?: string;
  umlautMode?: 'ae' | 'strip';
  defaultFlags?: string[];
  assignAllTeachersToClasses?: boolean;
  appleIdDomain?: string;
  appleIdPattern?: string;
}

export interface School {
  id: string;
  kz: string;
  name: string;
  type: 'grundschule' | 'regelschule' | 'gymnasium' | 'sonstige';
  location?: string;
  amsLocationId: string;
  active: boolean;
  config?: SchoolConfig;
  version?: number;
}

export interface RoleDefinition {
  id: string;
  name: string;
  canonical: string;
  aliases: string[];
  kontentyp: number;
  defaultFlags: string[];
  description?: string;
}
