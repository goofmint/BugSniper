-- Migration: Create scores table for Bug Sniper game results
-- Created: 2025-11-22

CREATE TABLE IF NOT EXISTS scores (
  id TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  issues_found INTEGER NOT NULL,
  total_issues INTEGER NOT NULL,
  accuracy REAL NOT NULL,
  ui_language TEXT NOT NULL,
  code_language TEXT NOT NULL,
  player_name TEXT,
  created_at TEXT NOT NULL,
  llm_feedback TEXT
);

-- Create index for faster ranking queries
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_code_language ON scores(code_language);
