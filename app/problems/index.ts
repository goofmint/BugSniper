/**
 * Problem and Issue type definitions for Bug Sniper game
 */

export type CodeLanguage = 'javascript' | 'php' | 'ruby' | 'java' | 'dart' | 'python';
export type CodeLanguageOrAll = CodeLanguage | 'all';

export type IssueType = 'bug' | 'security' | 'performance' | 'design';
export type IssueSeverity = 'minor' | 'normal' | 'critical';

export type Issue = {
  id: string;
  lines: number[];
  type: IssueType;
  severity: IssueSeverity;
  score: number;
  description: Record<'ja' | 'en', string>;
};

export type Problem = {
  id: string;
  codeLanguage: CodeLanguage;
  level: number;
  code: string[];
  issues: Issue[];
};

// Import all problem JSON files using Vite's glob import
// Supports: javascript, python, php, ruby, java, dart
const problemModules = import.meta.glob<{ default: Problem }>(
  './{javascript,python,php,ruby,java,dart}/level*/*.json',
  { eager: true }
);

// Cache for loaded problems
const problemsCache: Problem[] = [];
let cacheInitialized = false;

/**
 * Initialize problems cache
 */
function initializeProblemsCache() {
  if (cacheInitialized) return;

  for (const path in problemModules) {
    const problem = problemModules[path].default;
    problemsCache.push(problem);
  }

  cacheInitialized = true;
}

/**
 * Get problems by language and level
 * @param lang - Code language or 'all'
 * @param level - Problem difficulty level (1, 2, or 3)
 * @returns Array of problems matching the criteria
 */
export function getProblems(lang: CodeLanguageOrAll, level: number): Problem[] {
  initializeProblemsCache();

  return problemsCache.filter((problem) => {
    const langMatch = lang === 'all' || problem.codeLanguage === lang;
    const levelMatch = problem.level === level;
    return langMatch && levelMatch;
  });
}

/**
 * Get all problems
 * @returns Array of all problems
 */
export function getAllProblems(): Problem[] {
  initializeProblemsCache();
  return [...problemsCache];
}

/**
 * Calculate score with combo multiplier
 * @param baseScore - Base score from issue
 * @param combo - Current combo count
 * @returns Calculated score with multiplier applied
 */
export function calculateScore(baseScore: number, combo: number): number {
  let multiplier = 1.0;

  if (combo >= 4) {
    multiplier = 2.0;
  } else if (combo === 3) {
    multiplier = 1.5;
  } else if (combo === 2) {
    multiplier = 1.2;
  }

  return Math.floor(baseScore * multiplier);
}
