import { Link } from 'react-router';
import { Icon } from '@iconify/react';
import type { SupportedLanguage } from '../locales';
import { saveLanguage } from '../locales';

interface HeaderProps {
  currentLang: SupportedLanguage;
}

export function Header({ currentLang }: HeaderProps) {
  const handleLanguageSwitch = (lang: SupportedLanguage) => {
    saveLanguage(lang);
    // Set cookie for server-side detection
    document.cookie = `lang=${lang}; path=/; max-age=31536000`; // 1 year
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
      <Link to={`/${currentLang}`} className="text-xl font-bold tracking-tight">
        Bug Sniper
      </Link>
      <div className="flex items-center space-x-4">
        {/* Language switcher */}
        <div className="flex items-center space-x-2">
          <Link
            to="/ja"
            onClick={() => handleLanguageSwitch('ja')}
            className={`text-2xl transition-opacity hover:opacity-100 ${
              currentLang === 'ja' ? 'opacity-100' : 'opacity-50'
            }`}
            aria-label="日本語"
            title="日本語"
          >
            🇯🇵
          </Link>
          <Link
            to="/en"
            onClick={() => handleLanguageSwitch('en')}
            className={`text-2xl transition-opacity hover:opacity-100 ${
              currentLang === 'en' ? 'opacity-100' : 'opacity-50'
            }`}
            aria-label="English"
            title="English"
          >
            🇬🇧
          </Link>
        </div>

        {/* CodeRabbit link */}
        <a
          href="https://coderabbit.ai"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="CodeRabbit"
          className="transition-opacity hover:opacity-80"
        >
          <img src="/images/coderabbit-icon.svg" alt="CodeRabbit" className="w-6 h-6" />
        </a>

        {/* GitHub link */}
        <a
          href="https://github.com/goofmint/BugSniper"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <Icon icon="mdi:github" className="w-6 h-6" />
        </a>
      </div>
    </header>
  );
}
