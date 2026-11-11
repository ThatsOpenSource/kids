export type Sex = "m" | "w" | "d";

export interface PersonView {
  lkid: string;
  name: string;
  firstName: string;
  username: string;
  sexLabel: string;
  dateOfBirthDe: string;
  sids: string[];
  roleLabels: string[];
  classKeys: string[];
  flagIds: string[];
}