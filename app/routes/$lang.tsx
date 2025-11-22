import { redirect } from 'react-router';
import type { Route } from './+types/$lang';
import type { SupportedLanguage } from '../locales';
import { Welcome } from '../welcome/welcome';
import { Header } from '../components/Header';

/**
 * Language-specific home route
 */
export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang as SupportedLanguage;
  return [
    { title: 'Bug Sniper' },
    {
      name: 'description',
      content:
        lang === 'ja'
          ? 'コードレビューゲーム - バグを見つけてスコアを競おう！'
          : 'Code review game - Find bugs and compete for high scores!',
    },
  ];
}

export function loader({ params }: Route.LoaderArgs) {
  const lang = params.lang;

  // Validate language parameter
  if (lang !== 'ja' && lang !== 'en') {
    throw redirect('/');
  }

  return {
    lang: lang as SupportedLanguage,
  };
}

export default function LanguageHome({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <Header currentLang={loaderData.lang} />
      <Welcome lang={loaderData.lang} />
    </>
  );
}
