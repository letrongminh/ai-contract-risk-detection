import fs from 'fs';
import { getGeminiClient } from './geminiClient.js';

export async function uploadToGemini(filePath: string, mimeType: string, displayName: string) {
  const ai = getGeminiClient();
  try {
    const uploadResult = await ai.files.upload({
      file: filePath,
      config: {
        mimeType: mimeType,
        displayName: displayName
      }
    });
    return uploadResult;
  } catch (error) {
    console.error('Error uploading to Gemini:', error);
    throw error;
  }
}

export async function deleteFromGemini(name: string) {
  const ai = getGeminiClient();
  try {
    await ai.files.delete({ name });
  } catch (error) {
    console.error(`Error deleting file ${name} from Gemini:`, error);
  }
}

export function cleanupLocalFile(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(`Error deleting local file ${filePath}:`, error);
  }
}
