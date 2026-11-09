import { de } from './de';
import { en } from './en';

export type Locale = 'de' | 'en';
export type Messages = typeof de;

const catalogs: Record<Locale, Messages> = { de, en };

let current: Locale = (localStorage.getItem('kids_locale') as Locale) || 'de';

export function setLocale(locale: Locale) {
  current = locale;
  localStorage.setItem('kids_locale', locale);
}

export function getLocale(): Locale {
  return current;
}

export function t(): Messages {
  return catalogs[current] || de;
}
