/**
 * Game configuration
 * ゲーム設定
 */

export const gameConfig = {
  /**
   * Number of problems to select from each level
   * 各レベルから選択する問題数
   */
  problemsPerLevel: {
    1: 20,  // Level 1 problems
    2: 20,  // Level 2 problems
    3: 20,  // Level 3 problems
  },

  /**
   * Total game time in seconds
   * ゲームの制限時間（秒）
   */
  totalGameTime: 60,

  /**
   * Bonus points for finding all issues in a problem
   * 問題内の全ての問題を見つけた時のボーナスポイント
   */
  allIssuesFoundBonus: 3,
} as const;

export type GameConfig = typeof gameConfig;
