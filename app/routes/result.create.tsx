import { data } from 'react-router';
import type { Route } from './+types/result.create';
import { nanoid } from '../utils/nanoid';
import { generateFeedback } from '../utils/gemini';
import type { LLMFeedback } from '../utils/gemini';

/**
 * Type definition for game result data
 */
type GameResultData = {
  score: number;
  issuesFound: number;
  totalIssues: number;
  accuracy: number;
  uiLanguage: string;
  codeLanguage: string;
};

/**
 * Action to create a new score record in D1
 */
export async function action({ request, context }: Route.ActionArgs) {
  // Get D1 database from Cloudflare bindings
  const db = context.cloudflare.env.DB;

  if (!db) {
    throw data({ error: 'Database not configured' }, { status: 500 });
  }

  // Parse form data
  const formData = await request.formData();
  const payloadStr = formData.get('payload');

  if (!payloadStr || typeof payloadStr !== 'string') {
    throw data({ error: 'Invalid payload' }, { status: 400 });
  }

  let result: GameResultData;
  try {
    result = JSON.parse(payloadStr);
  } catch (e) {
    throw data({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate required fields
  if (
    typeof result.score !== 'number' ||
    typeof result.issuesFound !== 'number' ||
    typeof result.totalIssues !== 'number' ||
    typeof result.accuracy !== 'number' ||
    typeof result.uiLanguage !== 'string' ||
    typeof result.codeLanguage !== 'string'
  ) {
    throw data({ error: 'Missing or invalid fields' }, { status: 400 });
  }

  // Generate unique ID
  const id = nanoid();
  const createdAt = new Date().toISOString();

  // Generate LLM feedback
  let llmFeedback: LLMFeedback | null = null;
  const geminiApiKey = context.cloudflare.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      llmFeedback = await generateFeedback(
        {
          score: result.score,
          issuesFound: result.issuesFound,
          totalIssues: result.totalIssues,
          accuracy: result.accuracy,
          uiLanguage: result.uiLanguage,
          codeLanguage: result.codeLanguage,
        },
        geminiApiKey
      );
    } catch (error) {
      console.error('Failed to generate LLM feedback:', error);
      // Continue without feedback - this is not critical
    }
  } else {
    console.warn('GEMINI_API_KEY not configured - skipping LLM feedback generation');
  }

  try {
    // Insert into D1 database with LLM feedback
    await db
      .prepare(
        `INSERT INTO scores (
          id, score, issues_found, total_issues, accuracy,
          ui_language, code_language, created_at, llm_feedback
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        result.score,
        result.issuesFound,
        result.totalIssues,
        result.accuracy,
        result.uiLanguage,
        result.codeLanguage,
        createdAt,
        llmFeedback ? JSON.stringify(llmFeedback) : null
      )
      .run();

    // Return the result ID for client-side navigation
    return { success: true, id };
  } catch (error) {
    console.error('Failed to save score:', error);
    throw data({ error: 'Failed to save score' }, { status: 500 });
  }
}
