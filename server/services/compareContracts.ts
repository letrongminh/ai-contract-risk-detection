import { getGeminiClient } from './geminiClient.js';
import { COMPARATOR_PROMPT } from '../prompts/index.js';
import { comparisonSchema } from '../schemas/comparisonSchema.js';

export async function compareContracts(templateJson: any, submittedJson: any, contractTypeConfig: any) {
  const ai = getGeminiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${COMPARATOR_PROMPT}\n\nContract Rules:\n${JSON.stringify(contractTypeConfig, null, 2)}\n\nOfficial Template JSON:\n${JSON.stringify(templateJson, null, 2)}\n\nSubmitted Contract JSON:\n${JSON.stringify(submittedJson, null, 2)}`
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: comparisonSchema,
      temperature: 0.1,
    }
  });

  if (!response.text) {
    throw new Error('No text returned from Gemini');
  }

  return JSON.parse(response.text);
}
