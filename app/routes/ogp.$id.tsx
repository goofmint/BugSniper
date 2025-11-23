import type { LoaderFunctionArgs } from 'react-router';

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
 * Loader to generate OGP image
 */
export async function loader({ params, context, request }: LoaderFunctionArgs) {
  const { id } = params;
  const db = context.cloudflare.env.DB;

  if (!db) {
    return new Response('Database not configured', { status: 500 });
  }

  try {
    // Fetch score data from D1
    const result = await db
      .prepare('SELECT * FROM scores WHERE id = ?')
      .bind(id)
      .first<ScoreRecord>();

    if (!result) {
      return new Response('Score not found', { status: 404 });
    }

    // Generate SVG directly (without using satori)
    const svg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1200" height="630" fill="#000000"/>

        <!-- Border -->
        <rect x="4" y="4" width="1192" height="622" fill="none" stroke="#F1DCEE" stroke-width="8"/>

        <!-- Title -->
        <text x="600" y="150" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">
          Bug Sniper
        </text>

        <!-- Score -->
        <text x="600" y="280" font-family="Arial, sans-serif" font-size="96" font-weight="bold" fill="#38bdf8" text-anchor="middle">
          ${result.score} pt
        </text>

        <!-- Issues Found -->
        <text x="400" y="370" font-family="Arial, sans-serif" font-size="32" fill="#ffffff" text-anchor="middle">
          Issues Found: ${result.issues_found}/${result.total_issues}
        </text>

        <!-- Accuracy -->
        <text x="800" y="370" font-family="Arial, sans-serif" font-size="32" fill="#ffffff" text-anchor="middle">
          Accuracy: ${(result.accuracy * 100).toFixed(1)}%
        </text>

        <!-- Code Language -->
        <text x="600" y="430" font-family="Arial, sans-serif" font-size="28" fill="#94a3b8" text-anchor="middle">
          ${getCodeLanguageDisplay(result.code_language)}
        </text>

        <!-- CodeRabbit Icon placeholder (using circle for now) -->
        <circle cx="1130" cy="570" r="30" fill="#F1DCEE"/>
        <text x="1130" y="580" font-family="Arial, sans-serif" font-size="16" fill="#000000" text-anchor="middle">CR</text>
      </svg>
    `;

    // Return SVG image
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to generate OGP image:', error);
    return new Response('Failed to generate OGP image', { status: 500 });
  }
}

/**
 * This route only returns images via loader, so we export a null component
 */
export default function OgpImage() {
  return null;
}
