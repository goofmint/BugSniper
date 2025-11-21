/**
 * i18n utility for Bug Sniper
 */

import jaTranslations from './ja.json';
import enTranslations from './en.json';

export type SupportedLanguage = 'ja' | 'en';

const translations = {
  ja: jaTranslations,
  en: enTranslations,
};

/**
 * Get translation for a key in the specified language
 * @param key - Translation key (e.g., 'button.start')
 * @param lang - Language code ('ja' or 'en')
 * @returns Translated string
 */
export function t(key: string, lang: SupportedLanguage = 'en'): string {
  const dict = translations[lang];
  return (dict as Record<string, string>)[key] || key;
}

/**
 * Detect language from browser or URL
 * Priority: URL param > localStorage > navigator.language
 * @param searchParams - URL search params
 * @returns Detected language code
 */
export function detectLanguage(searchParams?: URLSearchParams): SupportedLanguage {
  // 1. Check URL parameter
  if (searchParams) {
    const langParam = searchParams.get('lang');
    if (langParam === 'ja' || langParam === 'en') {
      return langParam;
    }
  }

  // 2. Check localStorage (browser only)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('lang');
    if (stored === 'ja' || stored === 'en') {
      return stored;
    }

    // 3. Check navigator.language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ja')) {
      return 'ja';
    }
  }

  return 'en';
}

/**
 * Save language preference to localStorage
 * @param lang - Language code to save
 */
export function saveLanguage(lang: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lang', lang);
  }
}
