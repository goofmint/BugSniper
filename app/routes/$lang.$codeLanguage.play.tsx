import { useState, useEffect, useCallback } from 'react';
import { redirect, useFetcher, useNavigate } from 'react-router';
import type { Route } from './+types/$lang.$codeLanguage.play';
import type { SupportedLanguage } from '../locales';
import { t } from '../locales';
import type { CodeLanguageOrAll, Problem, Issue } from '../problems';
import { getProblems, calculateScore } from '../problems';
import { Header } from '../components/Header';
import { gameConfig } from '../config/game';

/**
 * Game state type
 */
type GameState = {
  currentProblem: Problem | null;
  currentLevel: number; // 1 → 2 → 3
  score: number;
  combo: number;
  remainingSeconds: number; // Game time from config → 0
  solvedIssueIds: string[]; // IDs of issues that have been found in current problem
  allSolvedIssueIds: string[]; // IDs of all issues found across all problems
  tappedLines: Record<string, number[]>; // Map of problem ID to tapped lines
  problemCount: number; // Number of problems solved
  usedProblemIds: string[]; // IDs of problems that have been used
  problemPool: Problem[]; // Pool of problems to be used in this game
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
 * Meta function to set page title
 */
export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: 'Bug Sniper' }];
  }

  const { codeLanguage } = data;
  const codeLangDisplay = getCodeLanguageDisplay(codeLanguage);

  return [
    {
      title: `${codeLangDisplay} | Bug Sniper`,
    },
  ];
}

/**
 * Validate route parameters and redirect if invalid
 */
export function loader({ params }: Route.LoaderArgs) {
  const { lang, codeLanguage } = params;

  // Validate language parameter
  if (lang !== 'ja' && lang !== 'en') {
    throw redirect('/');
  }

  // Validate code language parameter
  const validCodeLanguages = ['javascript', 'python', 'php', 'ruby', 'java', 'dart'];
  if (!validCodeLanguages.includes(codeLanguage)) {
    throw redirect(`/${lang}`);
  }

  return {
    lang: lang as SupportedLanguage,
    codeLanguage: codeLanguage as CodeLanguageOrAll,
  };
}

/**
 * Initialize problem pool based on game configuration
 * ゲーム設定に基づいて問題プールを初期化する
 */
function initializeProblemPool(codeLanguage: CodeLanguageOrAll): Problem[] {
  const pool: Problem[] = [];

  // For each level, randomly select the configured number of problems
  for (const [levelStr, count] of Object.entries(gameConfig.problemsPerLevel)) {
    const level = parseInt(levelStr);
    const allProblems = getProblems(codeLanguage, level);

    // Shuffle and take the first 'count' problems
    const shuffled = [...allProblems].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    pool.push(...selected);
  }

  // Shuffle the entire pool
  return pool.sort(() => Math.random() - 0.5);
}

/**
 * Select next problem from the problem pool
 * 問題プールから次の問題を選択する
 */
function selectNextProblemFromPool(pool: Problem[]): Problem | null {
  return pool.length > 0 ? pool[0] : null;
}


/**
 * Game component
 */
export default function Play({ loaderData }: Route.ComponentProps) {
  const { lang, codeLanguage } = loaderData;
  const fetcher = useFetcher();
  const navigate = useNavigate();

  // Initialize game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const problemPool = initializeProblemPool(codeLanguage);
    const firstProblem = selectNextProblemFromPool(problemPool);
    return {
      currentProblem: firstProblem,
      currentLevel: firstProblem?.level || 1,
      score: 0,
      combo: 0,
      remainingSeconds: gameConfig.totalGameTime,
      solvedIssueIds: [],
      allSolvedIssueIds: [],
      tappedLines: {},
      problemCount: 0,
      usedProblemIds: firstProblem ? [firstProblem.id] : [],
      problemPool: firstProblem ? problemPool.slice(1) : problemPool,
    };
  });
  const [gameEnded, setGameEnded] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'correct' | 'wrong' | 'complete';
    text: string;
    issue?: Issue;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update page title with remaining seconds
  useEffect(() => {
    if (typeof document !== 'undefined' && !gameEnded) {
      const codeLangDisplay = getCodeLanguageDisplay(codeLanguage);
      document.title = `(${gameState.remainingSeconds}s) ${codeLangDisplay} | Bug Sniper`;
    }
  }, [gameState.remainingSeconds, codeLanguage, gameEnded]);

  // Timer countdown
  useEffect(() => {
    if (gameEnded) return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        const newSeconds = prev.remainingSeconds - 1;
        if (newSeconds <= 0) {
          setGameEnded(true);
          return { ...prev, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: newSeconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameEnded]);

  // Clear feedback message after 2 seconds
  useEffect(() => {
    if (feedbackMessage) {
      const timeout = setTimeout(() => {
        setFeedbackMessage(null);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [feedbackMessage]);

  // Save score when game ends
  useEffect(() => {
    const scoreSaved = fetcher.state === 'idle' && fetcher.data?.success;

    if (gameEnded && !scoreSaved && fetcher.state === 'idle') {
      // Calculate total issues across all problems
      const allProblems = getProblems(codeLanguage, 1)
        .concat(getProblems(codeLanguage, 2))
        .concat(getProblems(codeLanguage, 3));

      const usedProblems = allProblems.filter((p) =>
        gameState.usedProblemIds.includes(p.id)
      );

      const totalIssues = usedProblems.reduce(
        (sum, problem) => sum + problem.issues.length,
        0
      );

      const issuesFound = gameState.allSolvedIssueIds.length;
      const accuracy = totalIssues > 0 ? issuesFound / totalIssues : 0;

      // Prepare result data
      const resultData = {
        score: gameState.score,
        issuesFound: issuesFound,
        totalIssues: totalIssues,
        accuracy: accuracy,
        uiLanguage: lang,
        codeLanguage: codeLanguage,
      };

      // Submit to result/create action
      fetcher.submit(
        { payload: JSON.stringify(resultData) },
        { method: 'post', action: '/result/create' }
      );
    }
  }, [gameEnded, fetcher.state, fetcher.data, gameState, codeLanguage, lang, fetcher]);

  // Navigate to result page when score is saved
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const data = fetcher.data as { success?: boolean; id?: string; error?: string };

      if (data.success && data.id) {
        // Add game_end parameter to show player-specific UI
        navigate(`/result/${data.id}?game_end=1`);
      } else if (data.error) {
        setError(data.error);
      } else if (!data.success) {
        setError(lang === 'ja' ? 'スコアの保存に失敗しました' : 'Failed to save score');
      }
    }
  }, [fetcher.data, fetcher.state, navigate, lang]);

  /**
   * Handle line tap
   */
  const handleLineTap = useCallback(
    (lineNumber: number) => {
      if (gameEnded || !gameState.currentProblem) return;

      const problemId = gameState.currentProblem.id;
      const alreadyTapped = gameState.tappedLines[problemId]?.includes(lineNumber) || false;

      // Ignore if already tapped
      if (alreadyTapped) return;

      // Find if this line has an issue
      const issues = gameState.currentProblem.issues;
      const hitIssue = issues.find(
        (issue) =>
          issue.lines.includes(lineNumber) && !gameState.solvedIssueIds.includes(issue.id)
      );

      setGameState((prev) => {
        const newTappedLines = {
          ...prev.tappedLines,
          [problemId]: [...(prev.tappedLines[problemId] || []), lineNumber],
        };

        if (hitIssue) {
          // Correct! Increase score and combo
          const newCombo = prev.combo + 1;
          const scoreGain = calculateScore(hitIssue.score, newCombo);
          const newSolvedIssueIds = [...prev.solvedIssueIds, hitIssue.id];
          const newAllSolvedIssueIds = [...prev.allSolvedIssueIds, hitIssue.id];

          setFeedbackMessage({
            type: 'correct',
            text: `+${scoreGain} (${t('label.combo', lang)}: ${newCombo}x)`,
            issue: hitIssue,
          });

          return {
            ...prev,
            score: prev.score + scoreGain,
            combo: newCombo,
            solvedIssueIds: newSolvedIssueIds,
            allSolvedIssueIds: newAllSolvedIssueIds,
            tappedLines: newTappedLines,
          };
        } else {
          // Wrong! Lose 1 point and reset combo
          setFeedbackMessage({
            type: 'wrong',
            text: `-1`,
          });

          return {
            ...prev,
            score: Math.max(0, prev.score - 1),
            combo: 0,
            tappedLines: newTappedLines,
          };
        }
      });
    },
    [gameEnded, gameState.currentProblem, gameState.tappedLines, gameState.solvedIssueIds, lang]
  );

  /**
   * Handle skip to next problem
   */
  const handleSkip = useCallback(() => {
    if (gameEnded || !gameState.currentProblem) return;

    const currentProblemIssues = gameState.currentProblem.issues;
    const allIssuesSolved = currentProblemIssues.every((issue) =>
      gameState.solvedIssueIds.includes(issue.id)
    );

    // Bonus for finding all issues
    let bonusScore = 0;
    if (allIssuesSolved && currentProblemIssues.length > 0) {
      bonusScore = gameConfig.allIssuesFoundBonus;
      setFeedbackMessage({
        type: 'complete',
        text: `+${bonusScore} (All issues found!)`,
      });
    }

    setGameState((prev) => {
      // Select next problem from pool
      const nextProblem = selectNextProblemFromPool(prev.problemPool);

      if (!nextProblem) {
        // No more problems available - end the game
        setGameEnded(true);
      }

      return {
        ...prev,
        currentProblem: nextProblem,
        currentLevel: nextProblem?.level || prev.currentLevel,
        score: prev.score + bonusScore,
        solvedIssueIds: [],
        problemCount: prev.problemCount + 1,
        usedProblemIds: nextProblem ? [...prev.usedProblemIds, nextProblem.id] : prev.usedProblemIds,
        problemPool: nextProblem ? prev.problemPool.slice(1) : prev.problemPool,
      };
    });
  }, [gameEnded, gameState.currentProblem, gameState.solvedIssueIds]);

  // Show game over screen
  if (gameEnded) {
    const isSaving = fetcher.state === 'submitting' || fetcher.state === 'loading';

    return (
      <>
        <Header currentLang={lang} />
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <h2 className="text-3xl font-bold">
              {lang === 'ja' ? 'ゲーム終了！' : 'Game Over!'}
            </h2>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 space-y-4">
              <div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {t('label.score', lang)}
                </div>
                <div className="text-5xl font-bold text-sky-600 dark:text-sky-400">
                  {gameState.score}
                </div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {lang === 'ja'
                  ? `${gameState.problemCount}問を解きました`
                  : `Solved ${gameState.problemCount} problems`}
              </div>
            </div>

            {isSaving && (
              <div className="text-sm text-slate-600 dark:text-slate-400 animate-pulse">
                {lang === 'ja' ? 'スコアを保存中...' : 'Saving score...'}
              </div>
            )}

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md p-3">
                {error}
              </div>
            )}

            <button
              onClick={() => (window.location.href = `/${lang}`)}
              className="w-full py-3 text-lg font-semibold rounded-md bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700 transition"
            >
              {lang === 'ja' ? 'ホームへ戻る' : 'Back to Home'}
            </button>
          </div>
        </div>
      </>
    );
  }

  // Show message if no problem available
  if (!gameState.currentProblem) {
    return (
      <>
        <Header currentLang={lang} />
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
          <div className="text-center space-y-4">
            <p className="text-lg">
              {lang === 'ja'
                ? '問題が見つかりませんでした。'
                : 'No problems available.'}
            </p>
            <button
              onClick={() => window.location.href = `/${lang}`}
              className="px-6 py-2 rounded-md bg-sky-500 text-white hover:bg-sky-600 transition"
            >
              {lang === 'ja' ? 'ホームへ戻る' : 'Back to Home'}
            </button>
          </div>
        </div>
      </>
    );
  }

  const currentTappedLines = gameState.tappedLines[gameState.currentProblem.id] || [];
  const currentProblemIssues = gameState.currentProblem.issues;
  const foundIssuesCount = gameState.solvedIssueIds.filter((id) =>
    currentProblemIssues.some((issue) => issue.id === id)
  ).length;

  return (
    <>
      <Header currentLang={lang} />
      <div className="flex flex-col h-[calc(100vh-56px)] relative">
        {/* Game stats header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <div className="flex items-center space-x-4 text-sm">
            <div>
              <span className="text-slate-600 dark:text-slate-400">{t('label.time', lang)}: </span>
              <span className={`font-semibold ${gameState.remainingSeconds <= 10 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {gameState.remainingSeconds}s
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">{t('label.score', lang)}: </span>
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {gameState.score}
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400">{t('label.combo', lang)}: </span>
              <span className="font-semibold text-orange-600 dark:text-orange-400">
                {gameState.combo}x
              </span>
            </div>
          </div>
        </div>

        {/* Floating Feedback message */}
        {feedbackMessage && (
          <div
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2 duration-300 max-w-md ${
              feedbackMessage.type === 'correct'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                : feedbackMessage.type === 'complete'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {feedbackMessage.issue ? (
              <div className="px-6 py-4 space-y-2">
                <div className="text-center text-sm font-semibold">
                  {feedbackMessage.text}
                </div>
                <div className="border-t border-emerald-200 dark:border-emerald-700 pt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{t('label.type', lang)}:</span>
                    <span className="capitalize">{feedbackMessage.issue.type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{t('label.severity', lang)}:</span>
                    <span className={`capitalize font-medium ${
                      feedbackMessage.issue.severity === 'critical'
                        ? 'text-red-600 dark:text-red-400'
                        : feedbackMessage.issue.severity === 'normal'
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {feedbackMessage.issue.severity}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{t('label.baseScore', lang)}:</span>
                    <span>{feedbackMessage.issue.score}</span>
                  </div>
                  <div className="text-xs pt-1">
                    <div className="font-medium mb-1">{t('label.description', lang)}:</div>
                    <div className="text-xs leading-relaxed">
                      {feedbackMessage.issue.description[lang]}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-6 py-3 text-center text-sm font-semibold">
                {feedbackMessage.text}
              </div>
            )}
          </div>
        )}

        {/* Problem info */}
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <div>
              Level {gameState.currentLevel} | {gameState.currentProblem.codeLanguage}
            </div>
            <div>
              {lang === 'ja' ? '発見' : 'Found'}: {foundIssuesCount} / {currentProblemIssues.length}
            </div>
          </div>
        </div>

        {/* Code display */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-xs sm:text-sm leading-relaxed font-mono bg-slate-50 dark:bg-slate-800 p-4 rounded-md">
            {gameState.currentProblem.code.map((line, idx) => {
              const lineNumber = idx + 1;
              const isTapped = currentTappedLines.includes(lineNumber);
              const hasIssue = gameState.currentProblem!.issues.some((issue) =>
                issue.lines.includes(lineNumber)
              );
              const isFound = isTapped && hasIssue;

              return (
                <div
                  key={idx}
                  onClick={() => handleLineTap(lineNumber)}
                  className={`py-1 px-2 -mx-2 rounded cursor-pointer transition-colors ${
                    isFound
                      ? 'bg-emerald-100 dark:bg-emerald-900'
                      : isTapped
                      ? 'bg-red-100 dark:bg-red-900'
                      : 'hover:bg-sky-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="inline-block w-8 text-right text-slate-400 select-none mr-2">
                    {lineNumber}
                  </span>
                  <span>{line}</span>
                </div>
              );
            })}
          </pre>
        </div>

        {/* Skip/Next button */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          <button
            onClick={handleSkip}
            className={`w-full py-2 rounded-md transition text-sm font-medium ${
              foundIssuesCount > 0
                ? 'bg-sky-500 text-white hover:bg-sky-600 active:bg-sky-700'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {foundIssuesCount > 0
              ? lang === 'ja'
                ? '次へ'
                : 'Next'
              : t('button.skip', lang)}
          </button>
        </div>
      </div>
    </>
  );
}
