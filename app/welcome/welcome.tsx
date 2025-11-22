import { Link } from 'react-router';
import { Icon } from '@iconify/react';
import type { SupportedLanguage } from '../locales';
import { t } from '../locales';

export function Welcome({ lang }: { lang: SupportedLanguage }) {

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
      <div className="flex flex-col items-center justify-center space-y-6 w-full max-w-md">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">{t('title', lang)}</h1>
          <p className="text-xl text-sky-600 dark:text-sky-400 font-semibold">
            {t('catchphrase', lang)}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">{t('rules.title', lang)}</h2>
            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{t('rules.time', lang)}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{t('rules.tap', lang)}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{t('rules.combo', lang)}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>{t('rules.skip', lang)}</span>
              </li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('label.codeLanguage', lang)}</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'javascript', icon: 'vscode-icons:file-type-js-official', label: 'JavaScript' },
                { value: 'python', icon: 'vscode-icons:file-type-python', label: 'Python' },
                { value: 'php', icon: 'vscode-icons:file-type-php', label: 'PHP' },
                { value: 'ruby', icon: 'vscode-icons:file-type-ruby', label: 'Ruby' },
                { value: 'java', icon: 'vscode-icons:file-type-java', label: 'Java' },
                { value: 'dart', icon: 'vscode-icons:file-type-dartlang', label: 'Dart' },
              ].map((item) => (
                <Link
                  key={item.value}
                  to={`/${lang}/${item.value}/play`}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30"
                >
                  <Icon icon={item.icon} className="text-3xl mb-1" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
