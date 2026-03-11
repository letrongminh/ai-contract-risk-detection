import { getGeminiClient } from './geminiClient.js';
import { TEMPLATE_EXTRACTOR_PROMPT } from '../prompts/index.js';
import { templateSchema } from '../schemas/templateSchema.js';

export async function extractTemplate(fileUri: string, mimeType: string, contractTypeConfig: any) {
  const ai = getGeminiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: fileUri,
              mimeType: mimeType
            }
          },
          {
            text: `${TEMPLATE_EXTRACTOR_PROMPT}\n\nContract Rules:\n${JSON.stringify(contractTypeConfig, null, 2)}`
          }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: templateSchema,
      temperature: 0.1,
    }
  });

  if (!response.text) {
    throw new Error('No text returned from Gemini');
  }

  return JSON.parse(response.text);
}
