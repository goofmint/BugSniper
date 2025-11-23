import satori from 'satori';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
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

    // Fetch CodeRabbit icon
    const iconUrl = new URL('/images/coderabbit-icon.png', request.url);
    const iconResponse = await fetch(iconUrl.toString());
    const iconBuffer = await iconResponse.arrayBuffer();
    const iconBase64 = btoa(String.fromCharCode(...new Uint8Array(iconBuffer)));

    // Fetch font (using Google Fonts API)
    const fontResponse = await fetch(
      'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff'
    );
    const fontData = await fontResponse.arrayBuffer();

    // Generate SVG using satori
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000',
          border: '8px solid #F1DCEE',
          position: 'relative',
          fontFamily: 'Inter',
          color: '#ffffff',
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            marginBottom: 30,
          }}
        >
          Bug Sniper
        </div>
        {/* Score */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 'bold',
            color: '#38bdf8',
            marginBottom: 20,
          }}
        >
          {result.score} pt
        </div>
        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: 60,
            fontSize: 32,
            marginBottom: 20,
          }}
        >
          <div>Issues Found: {result.issues_found}/{result.total_issues}</div>
          <div>Accuracy: {(result.accuracy * 100).toFixed(1)}%</div>
        </div>
        {/* Code Language */}
        <div
          style={{
            fontSize: 28,
            color: '#94a3b8',
          }}
        >
          {getCodeLanguageDisplay(result.code_language)}
        </div>
        {/* CodeRabbit Icon (bottom right) */}
        <img
          src={`data:image/png;base64,${iconBase64}`}
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 60,
            height: 60,
          }}
        />
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'Inter',
            data: fontData,
            weight: 400,
            style: 'normal',
          },
        ],
      }
    );

    // Initialize resvg-wasm
    const resvgWasm = await fetch(
      'https://unpkg.com/@resvg/resvg-wasm/index_bg.wasm'
    ).then((res) => res.arrayBuffer());

    await initWasm(resvgWasm);

    // Convert SVG to PNG
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: 1200,
      },
    });

    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    // Return PNG image
    return new Response(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
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
