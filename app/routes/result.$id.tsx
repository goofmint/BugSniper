import { data } from 'react-router';
import { useFetcher } from 'react-router';
import { useEffect } from 'react';
import type { Route } from './+types/result.$id';
import { Header } from '../components/Header';
import type { SupportedLanguage } from '../locales';
import { t } from '../locales';
import { generateAndUploadOGPImage } from '../utils/imageGenerator';

/**
 * Score record type from D1
 */
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
  llm_feedback: string | null;
};

/**
 * Get proper display name for code language
 */
function getCodeLanguageDisplay(codeLanguage: string): string {
  const languageMap: Record<string, string> = {
    javascript: 'JavaScript',
    python: 'Python',
    php: 'PHP',
    ruby: 'Ruby',
    java: 'Java',
    dart: 'Dart',
  };
  return languageMap[codeLanguage] || codeLanguage;
}

/**
 * Meta function to set page title and OGP tags
 */
export function meta({ data }: Route.MetaArgs) {
  if (!data || !data.score) {
    return [{ title: 'Result Not Found | Bug Sniper' }];
  }

  const { score, baseUrl } = data;
  const codeLangDisplay = getCodeLanguageDisplay(score.code_language);

  // Construct full URLs for OGP
  const url = `${baseUrl}/result/${score.id}`;
  const ogImageUrl = `${baseUrl}/ogp/${score.id}`;

  return [
    {
      title: `${codeLangDisplay} ${score.score}pt | Bug Sniper`,
    },
    // Open Graph tags
    { property: 'og:title', content: `Bug Sniper - ${codeLangDisplay} ${score.score}pt` },
    { property: 'og:description', content: `Found ${score.issues_found}/${score.total_issues} issues with ${(score.accuracy * 100).toFixed(1)}% accuracy` },
    { property: 'og:image', content: ogImageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:url', content: url },
    { property: 'og:type', content: 'website' },
    // Twitter Card tags
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: `Bug Sniper - ${codeLangDisplay} ${score.score}pt` },
    { name: 'twitter:description', content: `Found ${score.issues_found}/${score.total_issues} issues with ${(score.accuracy * 100).toFixed(1)}% accuracy` },
    { name: 'twitter:image', content: ogImageUrl },
  ];
}

/**
 * Loader to fetch score data from D1
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { id } = params;
  const db = context.cloudflare.env.DB;

  if (!db) {
    throw data({ error: 'Database not configured' }, { status: 500 });
  }

  // Check if this is the player who just finished the game
  const url = new URL(request.url);
  const isGameEnd = url.searchParams.get('game_end') === '1';

  // Get the base URL for OGP meta tags
  const baseUrl = `${url.protocol}//${url.host}`;

  try {
    const result = await db
      .prepare('SELECT * FROM scores WHERE id = ?')
      .bind(id)
      .first<ScoreRecord>();

    if (!result) {
      throw data({ error: 'Score not found' }, { status: 404 });
    }

    return { score: result, isGameEnd, baseUrl };
  } catch (error) {
    console.error('Failed to fetch score:', error);
    throw data({ error: 'Failed to fetch score' }, { status: 500 });
  }
}

/**
 * Action to update player name
 */
export async function action({ params, request, context }: Route.ActionArgs) {
  const { id } = params;
  const db = context.cloudflare.env.DB;

  if (!db) {
    throw data({ error: 'Database not configured' }, { status: 500 });
  }

  const formData = await request.formData();
  const playerName = formData.get('playerName');

  if (!playerName || typeof playerName !== 'string') {
    throw data({ error: 'Invalid player name' }, { status: 400 });
  }

  // Validate player name length
  if (playerName.length > 50 || playerName.length === 0) {
    throw data({ error: 'Player name must be between 1 and 50 characters' }, { status: 400 });
  }

  try {
    await db
      .prepare('UPDATE scores SET player_name = ? WHERE id = ?')
      .bind(playerName, id)
      .run();

    return { success: true };
  } catch (error) {
    console.error('Failed to update player name:', error);
    throw data({ error: 'Failed to update player name' }, { status: 500 });
  }
}

/**
 * LLM Feedback type (matches the structure from gemini.ts)
 */
type LLMFeedback = {
  summary: string;
  strengths: string[];
  weakPoints: string[];
  advice: string[];
};

/**
 * Result page component
 */
export default function Result({ loaderData }: Route.ComponentProps) {
  const { score, isGameEnd } = loaderData;
  const fetcher = useFetcher();
  const lang = (score.ui_language as SupportedLanguage) || 'en';

  // Check if name update is in progress
  const isUpdating = fetcher.state === 'submitting';
  const hasName = score.player_name !== null;

  // Generate and upload OGP image when page loads (only for game end)
  useEffect(() => {
    if (isGameEnd && typeof window !== 'undefined') {
      generateAndUploadOGPImage(score.id, {
        score: score.score,
        issuesFound: score.issues_found,
        totalIssues: score.total_issues,
        accuracy: score.accuracy,
        codeLanguage: score.code_language,
      }).catch((error) => {
        console.error('Failed to generate OGP image:', error);
      });
    }
  }, [isGameEnd, score]);

  // Parse LLM feedback if available (always shown now)
  let llmFeedback: LLMFeedback | null = null;
  if (score.llm_feedback) {
    try {
      llmFeedback = JSON.parse(score.llm_feedback);
    } catch (error) {
      console.error('Failed to parse LLM feedback:', error);
    }
  }

  return (
    <>
      <Header currentLang={lang} />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          {/* Title */}
          <h1 className="text-3xl font-bold text-center">
            {lang === 'ja' ? 'ゲーム結果' : 'Game Result'}
          </h1>

          {/* Score Card */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
            {/* Main Score */}
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {t('label.score', lang)}
              </div>
              <div className="text-6xl font-bold text-sky-600 dark:text-sky-400">
                {score.score}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {lang === 'ja' ? '発見した問題' : 'Issues Found'}
                </div>
                <div className="text-2xl font-semibold">
                  {score.issues_found} / {score.total_issues}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {lang === 'ja' ? '正答率' : 'Accuracy'}
                </div>
                <div className="text-2xl font-semibold">
                  {(score.accuracy * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {lang === 'ja' ? 'コード言語' : 'Code Language'}:
                </span>
                <span className="font-medium">{getCodeLanguageDisplay(score.code_language)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  {lang === 'ja' ? 'プレイ日時' : 'Played at'}:
                </span>
                <span className="font-medium">
                  {new Date(score.created_at).toLocaleString(lang)}
                </span>
              </div>
            </div>
          </div>

          {/* Player Name Section */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
            {isGameEnd ? (
              // Game end view: Show name input or registered name
              hasName ? (
                <div className="text-center">
                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {lang === 'ja' ? 'プレイヤー名' : 'Player Name'}
                  </div>
                  <div className="text-xl font-semibold">{score.player_name}</div>
                </div>
              ) : (
                <fetcher.Form method="post" className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {lang === 'ja'
                        ? 'プレイヤー名を登録（任意）'
                        : 'Register Player Name (Optional)'}
                    </span>
                    <input
                      type="text"
                      name="playerName"
                      maxLength={50}
                      required
                      disabled={isUpdating}
                      className="mt-1 w-full px-3 py-2 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
                      placeholder={lang === 'ja' ? 'あなたの名前' : 'Your name'}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-2 rounded-md bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 transition disabled:opacity-50 font-medium"
                  >
                    {isUpdating
                      ? lang === 'ja'
                        ? '登録中...'
                        : 'Saving...'
                      : lang === 'ja'
                        ? '名前を登録'
                        : 'Save Name'}
                  </button>
                </fetcher.Form>
              )
            ) : (
              // Shared link view: Show name as text or "Unregistered"
              <div className="text-center">
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {lang === 'ja' ? 'プレイヤー名' : 'Player Name'}
                </div>
                <div className="text-xl font-semibold">
                  {score.player_name || (lang === 'ja' ? '未登録ユーザー' : 'Unregistered User')}
                </div>
              </div>
            )}
          </div>

          {/* LLM Feedback Section - Always shown if available */}
          {llmFeedback && (
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-6 space-y-4 border border-sky-200 dark:border-slate-600">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-lg font-bold text-sky-700 dark:text-sky-300">
                  {lang === 'ja' ? '🤖 AI フィードバック' : '🤖 AI Feedback'}
                </div>
              </div>

              {/* Summary */}
              <div>
                <p className="text-slate-800 dark:text-slate-200">{llmFeedback.summary}</p>
              </div>

              {/* Strengths */}
              {llmFeedback.strengths.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                    {lang === 'ja' ? '✨ 強み' : '✨ Strengths'}
                  </h3>
                  <ul className="space-y-1">
                    {llmFeedback.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                      >
                        <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weak Points */}
              {llmFeedback.weakPoints.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">
                    {lang === 'ja' ? '💡 改善点' : '💡 Areas for Improvement'}
                  </h3>
                  <ul className="space-y-1">
                    {llmFeedback.weakPoints.map((point, index) => (
                      <li
                        key={index}
                        className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                      >
                        <span className="text-orange-600 dark:text-orange-400 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Advice */}
              {llmFeedback.advice.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-sky-700 dark:text-sky-400 mb-2">
                    {lang === 'ja' ? '🎯 アドバイス' : '🎯 Advice'}
                  </h3>
                  <ul className="space-y-1">
                    {llmFeedback.advice.map((tip, index) => (
                      <li
                        key={index}
                        className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2"
                      >
                        <span className="text-sky-600 dark:text-sky-400 mt-0.5">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`/${lang}`}
              className="flex-1 py-3 text-center rounded-md bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 transition font-medium"
            >
              {isGameEnd
                ? lang === 'ja'
                  ? 'もう一度プレイ'
                  : 'Play Again'
                : lang === 'ja'
                  ? '挑戦する'
                  : 'Play'}
            </a>
            <a
              href={`/${lang}/ranking`}
              className="flex-1 py-3 text-center rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition font-medium"
            >
              {lang === 'ja' ? 'ランキングを見る' : 'View Ranking'}
            </a>
          </div>

          {/* Share Link - Only shown for game end */}
          {isGameEnd && (
            <div className="text-center">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {lang === 'ja' ? 'この結果をシェア' : 'Share this result'}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/result/${score.id}`}
                  className="flex-1 px-3 py-2 text-sm rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/result/${score.id}`;
                    navigator.clipboard.writeText(url);
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition font-medium whitespace-nowrap"
                >
                  {lang === 'ja' ? 'コピー' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
