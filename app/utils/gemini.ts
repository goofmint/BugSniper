/**
 * Gemini API integration for generating LLM feedback
 */

/**
 * LLM Feedback structure
 */
export type LLMFeedback = {
  summary: string;
  strengths: string[];
  weakPoints: string[];
  advice: string[];
};

/**
 * Game result data for feedback generation
 */
export type FeedbackInput = {
  score: number;
  issuesFound: number;
  totalIssues: number;
  accuracy: number;
  uiLanguage: string;
  codeLanguage: string;
};

/**
 * Generate feedback using Gemini API
 * @param input - Game result data
 * @param apiKey - Gemini API key
 * @returns LLM feedback object
 */
export async function generateFeedback(
  input: FeedbackInput,
  apiKey: string
): Promise<LLMFeedback> {
  const { score, issuesFound, totalIssues, accuracy, uiLanguage, codeLanguage } = input;

  // Prepare prompt based on UI language
  const prompt =
    uiLanguage === 'ja'
      ? `あなたはコードレビューの専門家です。以下のゲーム結果に基づいて、プレイヤーへのフィードバックを生成してください。

ゲーム結果:
- スコア: ${score}点
- 発見した問題: ${issuesFound}/${totalIssues}
- 正答率: ${(accuracy * 100).toFixed(1)}%
- コード言語: ${codeLanguage}

以下の形式でJSONを出力してください:
{
  "summary": "全体的な評価（1-2文）",
  "strengths": ["強み1", "強み2"],
  "weakPoints": ["改善点1", "改善点2"],
  "advice": ["アドバイス1", "アドバイス2"]
}

注意: JSONのみを出力し、他の説明は含めないでください。`
      : `You are a code review expert. Generate feedback for the player based on the following game results.

Game Results:
- Score: ${score} points
- Issues Found: ${issuesFound}/${totalIssues}
- Accuracy: ${(accuracy * 100).toFixed(1)}%
- Code Language: ${codeLanguage}

Output in the following JSON format:
{
  "summary": "Overall evaluation (1-2 sentences)",
  "strengths": ["strength 1", "strength 2"],
  "weakPoints": ["weak point 1", "weak point 2"],
  "advice": ["advice 1", "advice 2"]
}

Note: Output only JSON, without any other explanation.`;

  try {
    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();

    // Extract text from Gemini response
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('No text generated from Gemini API');
    }

    // Parse JSON from generated text
    // Remove markdown code blocks if present
    const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const feedback: LLMFeedback = JSON.parse(cleanedText);

    // Validate feedback structure
    if (
      typeof feedback.summary !== 'string' ||
      !Array.isArray(feedback.strengths) ||
      !Array.isArray(feedback.weakPoints) ||
      !Array.isArray(feedback.advice)
    ) {
      throw new Error('Invalid feedback structure from Gemini API');
    }

    return feedback;
  } catch (error) {
    console.error('Failed to generate feedback:', error);

    // Return fallback feedback based on language
    return getFallbackFeedback(input);
  }
}

/**
 * Generate fallback feedback when API fails
 * @param input - Game result data
 * @returns Fallback feedback object
 */
function getFallbackFeedback(input: FeedbackInput): LLMFeedback {
  const { score, accuracy, uiLanguage } = input;

  if (uiLanguage === 'ja') {
    const summary =
      accuracy >= 0.8
        ? `素晴らしい結果です！${score}点を獲得しました。`
        : accuracy >= 0.5
          ? `良い結果です！${score}点を獲得しました。`
          : `${score}点を獲得しました。練習を重ねて上達しましょう。`;

    return {
      summary,
      strengths:
        accuracy >= 0.5
          ? ['コードの問題を見つける能力が優れています', '集中力を維持できています']
          : ['ゲームの基本を理解しています'],
      weakPoints:
        accuracy < 0.8
          ? ['正答率を上げる余地があります', 'より多くの問題パターンに慣れましょう']
          : ['完璧です！'],
      advice: [
        'さまざまなコード言語で練習してみましょう',
        'セキュリティ、バグ、パフォーマンスの各カテゴリに注目しましょう',
      ],
    };
  } else {
    const summary =
      accuracy >= 0.8
        ? `Excellent work! You scored ${score} points.`
        : accuracy >= 0.5
          ? `Good job! You scored ${score} points.`
          : `You scored ${score} points. Keep practicing to improve!`;

    return {
      summary,
      strengths:
        accuracy >= 0.5
          ? ['Strong ability to identify code issues', 'Good focus and concentration']
          : ['Understanding of game basics'],
      weakPoints:
        accuracy < 0.8
          ? ['Room to improve accuracy', 'Familiarize yourself with more issue patterns']
          : ['Perfect performance!'],
      advice: [
        'Try practicing with different code languages',
        'Focus on security, bug, and performance categories',
      ],
    };
  }
}
