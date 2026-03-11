import { getGeminiClient } from './geminiClient.js';
import { buildComparatorPrompt } from '../prompts/index.js';
import { comparisonSchema } from '../schemas/comparisonSchema.js';
import {
  getEnglishLeakageFields,
  normalizeComparisonResult,
} from './normalizeComparisonResult.js';

async function requestComparisonResult({
  templateJson,
  submittedJson,
  contractTypeConfig,
  retryForVietnamese,
}: {
  templateJson: unknown;
  submittedJson: unknown;
  contractTypeConfig: Record<string, unknown>;
  retryForVietnamese: boolean;
}) {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: buildComparatorPrompt({
              contractTypeConfig,
              templateJson,
              submittedJson,
              retryForVietnamese,
            }),
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: comparisonSchema,
      temperature: 0.1,
    },
  });

  if (!response.text) {
    throw new Error('Gemini không trả về nội dung phân tích.');
  }

  return JSON.parse(response.text);
}

export async function compareContracts(
  templateJson: unknown,
  submittedJson: unknown,
  contractTypeConfig: Record<string, unknown>,
) {
  const initialResult = await requestComparisonResult({
    templateJson,
    submittedJson,
    contractTypeConfig,
    retryForVietnamese: false,
  });
  const normalizedInitialResult = normalizeComparisonResult(initialResult);
  const initialLeakageFields = getEnglishLeakageFields(normalizedInitialResult);

  if (!initialLeakageFields.length) {
    return normalizedInitialResult;
  }

  const retriedResult = await requestComparisonResult({
    templateJson,
    submittedJson,
    contractTypeConfig,
    retryForVietnamese: true,
  });
  const normalizedRetriedResult = normalizeComparisonResult(retriedResult);
  const retryLeakageFields = getEnglishLeakageFields(normalizedRetriedResult);

  if (retryLeakageFields.length) {
    throw new Error(
      `Kết quả phân tích vẫn chứa tiếng Anh ở các trường: ${retryLeakageFields.join(', ')}.`,
    );
  }

  return normalizedRetriedResult;
}
