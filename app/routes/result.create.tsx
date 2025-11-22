import { data } from 'react-router';
import type { Route } from './+types/result.create';
import { nanoid } from '../utils/nanoid';

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
  console.log('[result.create] Action called');

  // Get D1 database from Cloudflare bindings
  const db = context.cloudflare.env.DB;

  if (!db) {
    console.error('[result.create] Database not configured');
    throw data({ error: 'Database not configured' }, { status: 500 });
  }

  console.log('[result.create] Database available');

  // Parse form data
  const formData = await request.formData();
  const payloadStr = formData.get('payload');

  console.log('[result.create] Payload:', payloadStr);

  if (!payloadStr || typeof payloadStr !== 'string') {
    console.error('[result.create] Invalid payload');
    throw data({ error: 'Invalid payload' }, { status: 400 });
  }

  let result: GameResultData;
  try {
    result = JSON.parse(payloadStr);
    console.log('[result.create] Parsed result:', result);
  } catch (e) {
    console.error('[result.create] JSON parse error:', e);
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

  try {
    console.log('[result.create] Inserting into D1 with ID:', id);

    // Insert into D1 database
    const insertResult = await db
      .prepare(
        `INSERT INTO scores (
          id, score, issues_found, total_issues, accuracy,
          ui_language, code_language, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        result.score,
        result.issuesFound,
        result.totalIssues,
        result.accuracy,
        result.uiLanguage,
        result.codeLanguage,
        createdAt
      )
      .run();

    console.log('[result.create] Insert result:', insertResult);
    console.log('[result.create] Successfully saved, returning ID:', id);

    // Return the result ID for client-side navigation
    return { success: true, id };
  } catch (error) {
    console.error('[result.create] Failed to save score:', error);
    throw data({ error: 'Failed to save score' }, { status: 500 });
  }
}
