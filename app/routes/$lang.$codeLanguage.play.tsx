import { useState, useEffect, useCallback } from 'react';
import { redirect } from 'react-router';
import type { Route } from './+types/$lang.$codeLanguage.play';
import type { SupportedLanguage } from '../locales';
import { t } from '../locales';
import type { CodeLanguageOrAll, Problem } from '../problems';
import { getProblems, calculateScore } from '../problems';
import { Header } from '../components/Header';

/**
 * Game state type
 */
type GameState = {
  currentProblem: Problem | null;
  currentLevel: number; // 1 → 2 → 3
  score: number;
  combo: number;
  remainingSeconds: number; // 60 → 0
  solvedIssueIds: string[]; // IDs of issues that have been found
  tappedLines: Record<string, number[]>; // Map of problem ID to tapped lines
  problemCount: number; // Number of problems solved
};

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
 * Select a random problem from the available problems for the given level
 */
function selectRandomProblem(
  codeLanguage: CodeLanguageOrAll,
  level: number,
  excludeIds: string[] = []
): Problem | null {
  const problems = getProblems(codeLanguage, level);
  const availableProblems = problems.filter((p) => !excludeIds.includes(p.id));

  if (availableProblems.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * availableProblems.length);
  return availableProblems[randomIndex];
}

/**
 * Check if all problems of a specific level have been used
 */
function allLevelProblemsUsed(
  codeLanguage: CodeLanguageOrAll,
  level: number,
  usedIds: string[]
): boolean {
  const levelProblems = getProblems(codeLanguage, level);
  return levelProblems.length > 0 && levelProblems.every((p) => usedIds.includes(p.id));
}

/**
 * Select next problem, advancing levels if current level has no available problems
 */
function selectNextProblemWithLevelAdvance(
  codeLanguage: CodeLanguageOrAll,
  currentLevel: number,
  usedProblemIds: string[]
): { problem: Problem | null; level: number } {
  // Determine starting level
  let nextLevel = currentLevel;

  // Check if all problems of current level have been used
  if (allLevelProblemsUsed(codeLanguage, currentLevel, usedProblemIds)) {
    // Advance to next level (max level 3)
    nextLevel = Math.min(currentLevel + 1, 3);
  } else {
    // Stay at current level
    nextLevel = currentLevel;
  }

  // Try to find a problem at the determined level
  let problem = selectRandomProblem(codeLanguage, nextLevel, usedProblemIds);

  // If no problem found at current level, try advancing to next levels
  if (!problem && nextLevel < 3) {
    for (let level = nextLevel + 1; level <= 3; level++) {
      problem = selectRandomProblem(codeLanguage, level, usedProblemIds);
      if (problem) {
        nextLevel = level;
        break;
      }
    }
  }

  return { problem, level: nextLevel };
}

/**
 * Game component
 */
export default function Play({ loaderData }: Route.ComponentProps) {
  const { lang, codeLanguage } = loaderData;

  // Initialize game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const firstProblem = selectRandomProblem(codeLanguage, 1);
    return {
      currentProblem: firstProblem,
      currentLevel: 1,
      score: 0,
      combo: 0,
      remainingSeconds: 60,
      solvedIssueIds: [],
      tappedLines: {},
      problemCount: 0,
    };
  });

  const [usedProblemIds, setUsedProblemIds] = useState<string[]>(
    gameState.currentProblem ? [gameState.currentProblem.id] : []
  );
  const [gameEnded, setGameEnded] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'correct' | 'wrong' | 'complete';
    text: string;
  } | null>(null);

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

          setFeedbackMessage({
            type: 'correct',
            text: `+${scoreGain} (${t('label.combo', lang)}: ${newCombo}x)`,
          });

          return {
            ...prev,
            score: prev.score + scoreGain,
            combo: newCombo,
            solvedIssueIds: newSolvedIssueIds,
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
      bonusScore = 3;
      setFeedbackMessage({
        type: 'complete',
        text: `+${bonusScore} (All issues found!)`,
      });
    }

    setGameState((prev) => {
      // Select next problem and determine level
      const { problem: nextProblem, level: nextLevel } = selectNextProblemWithLevelAdvance(
        codeLanguage,
        prev.currentLevel,
        usedProblemIds
      );

      if (nextProblem) {
        setUsedProblemIds((prevIds) => [...prevIds, nextProblem.id]);
      } else {
        // No more problems available - end the game
        setGameEnded(true);
      }

      return {
        ...prev,
        currentProblem: nextProblem,
        currentLevel: nextLevel,
        score: prev.score + bonusScore,
        solvedIssueIds: [],
        problemCount: prev.problemCount + 1,
      };
    });
  }, [gameEnded, gameState.currentProblem, gameState.solvedIssueIds, codeLanguage, usedProblemIds]);

  // Show game over screen
  if (gameEnded) {
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
            <button
              onClick={() => window.location.href = `/${lang}`}
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
      <div className="flex flex-col h-[calc(100vh-56px)]">
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

        {/* Feedback message */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2 text-center text-sm font-semibold ${
              feedbackMessage.type === 'correct'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                : feedbackMessage.type === 'complete'
                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {feedbackMessage.text}
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
