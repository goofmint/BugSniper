import type { Route } from './+types/$lang.ranking';
import { redirect } from 'react-router';
import { useLoaderData } from 'react-router';
import { t, type SupportedLanguage } from '~/locales';
import { Header } from '~/components/Header';

type ScoreRecord = {
  id: string;
  score: number;
  issues_found: number;
  total_issues: number;
  accuracy: number;
  ui_language: string;
  code_language: string;
  player_name: string | null;
  created_at: string;
};

export function meta({ params }: Route.MetaArgs) {
  const lang = params.lang as SupportedLanguage;
  const title = t('ranking.title', lang);
  const period = t('ranking.period.week', lang);

  return [{ title: `${title} (${period}) | Bug Sniper` }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const lang = params.lang;

  // Validate language parameter
  if (lang !== 'ja' && lang !== 'en') {
    throw redirect('/');
  }

  const url = new URL(request.url);
  const codeLanguage = url.searchParams.get('code') || 'all';

  const db = context.cloudflare.env.DB;

  if (!db) {
    throw new Response('Database not configured', { status: 500 });
  }

  // Get top 50 scores from the last 7 days
  let query: string;
  let queryParams: string[];

  if (codeLanguage === 'all') {
    query = `
      SELECT * FROM scores
      WHERE created_at >= datetime('now', '-7 days')
      ORDER BY score DESC
      LIMIT 50
    `;
    queryParams = [];
  } else {
    query = `
      SELECT * FROM scores
      WHERE code_language = ?
        AND created_at >= datetime('now', '-7 days')
      ORDER BY score DESC
      LIMIT 50
    `;
    queryParams = [codeLanguage];
  }

  const result = await db.prepare(query).bind(...queryParams).all();

  return {
    scores: (result.results || []) as ScoreRecord[],
    codeLanguage,
    lang: lang as SupportedLanguage,
  };
}

function getCodeLanguageDisplay(code: string): string {
  const map: Record<string, string> = {
    all: 'All',
    javascript: 'JavaScript',
    python: 'Python',
    php: 'PHP',
    ruby: 'Ruby',
    java: 'Java',
    dart: 'Dart',
  };
  return map[code] || code;
}

export default function Ranking() {
  const { scores, codeLanguage, lang } = useLoaderData<typeof loader>();

  const codeLanguages = ['all', 'javascript', 'python', 'php', 'ruby', 'java', 'dart'];

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <Header currentLang={lang} />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('ranking.title', lang)}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('ranking.period.week', lang)}
          </p>
        </div>

        {/* Language Filter Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2">
          {codeLanguages.map((code) => {
            const isActive = codeLanguage === code;
            const href = `/${lang}/ranking?code=${code}`;

            return (
              <a
                key={code}
                href={href}
                className={`
                  px-4 py-2 rounded-md font-medium text-sm whitespace-nowrap transition
                  ${
                    isActive
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }
                `}
              >
                {t(`language.${code}`, lang)}
              </a>
            );
          })}
        </div>

        {/* Ranking Table */}
        {scores.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            {t('ranking.noData', lang)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3 px-2 text-left text-sm font-semibold">
                    {t('ranking.rank', lang)}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">
                    {t('ranking.player', lang)}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold">
                    {t('ranking.codeLanguage', lang)}
                  </th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">
                    {t('ranking.score', lang)}
                  </th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">
                    {t('ranking.accuracy', lang)}
                  </th>
                  <th className="py-3 px-4 text-right text-sm font-semibold">
                    {t('ranking.date', lang)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score: ScoreRecord, index: number) => {
                  const rank = index + 1;
                  const rankClass =
                    rank === 1
                      ? 'text-yellow-600 dark:text-yellow-400 font-bold'
                      : rank === 2
                        ? 'text-slate-400 dark:text-slate-500 font-bold'
                        : rank === 3
                          ? 'text-orange-600 dark:text-orange-400 font-bold'
                          : '';

                  return (
                    <tr
                      key={score.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className={`py-3 px-2 text-sm ${rankClass}`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`/result/${score.id}`}
                          className="text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          {score.player_name || t('ranking.anonymous', lang)}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getCodeLanguageDisplay(score.code_language)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {score.score}
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600 dark:text-slate-400">
                        {(score.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(score.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Back to Home Button */}
        <div className="flex justify-center pt-6">
          <a
            href={`/${lang}`}
            className="px-6 py-3 rounded-md bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 transition font-medium"
          >
            {t('nav.home', lang)}
          </a>
        </div>
      </main>
    </div>
  );
}
