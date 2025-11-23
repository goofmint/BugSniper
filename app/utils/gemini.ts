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

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

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
    // Re-throw the error to make failures visible
    throw error;
  }
}
