import { Router } from 'express';
import { upload } from '../services/fileUpload.js';
import { uploadToGemini, deleteFromGemini, cleanupLocalFile } from '../services/fileManager.js';
import { extractTemplate } from '../services/extractTemplate.js';
import { extractSubmitted } from '../services/extractSubmitted.js';
import { compareContracts } from '../services/compareContracts.js';
import { contractTypeConfig } from '../schemas/contractTypeConfig.js';

const router = Router();

router.post('/', upload.fields([
  { name: 'templateFile', maxCount: 1 },
  { name: 'submittedFile', maxCount: 1 }
]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  
  if (!files || !files.templateFile || !files.submittedFile) {
    res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Missing required files. Please upload both templateFile and submittedFile.'
      }
    });
    return;
  }

  const templateFile = files.templateFile[0];
  const submittedFile = files.submittedFile[0];

  let templateGeminiFile: any = null;
  let submittedGeminiFile: any = null;

  try {
    // 1. Upload to Gemini Files API
    templateGeminiFile = await uploadToGemini(templateFile.path, templateFile.mimetype, 'Template Contract');
    submittedGeminiFile = await uploadToGemini(submittedFile.path, submittedFile.mimetype, 'Submitted Contract');

    // 2. Extract Template
    const templateJson = await extractTemplate(templateGeminiFile.uri, templateFile.mimetype, contractTypeConfig);

    // 3. Extract Submitted
    const submittedJson = await extractSubmitted(submittedGeminiFile.uri, submittedFile.mimetype, contractTypeConfig);

    // 4. Compare
    const comparisonResult = await compareContracts(templateJson, submittedJson, contractTypeConfig);

    // 5. Return result
    res.json({
      jobId: `job_${Date.now()}`,
      result: comparisonResult
    });

  } catch (error: any) {
    console.error('Analysis failed:', error);
    res.status(500).json({
      error: {
        code: 'ANALYSIS_FAILED',
        message: error.message || 'Could not complete contract analysis.'
      }
    });
  } finally {
    // Cleanup local files
    cleanupLocalFile(templateFile.path);
    cleanupLocalFile(submittedFile.path);

    // Cleanup Gemini files (optional, as they expire in 48h, but good practice)
    if (templateGeminiFile?.name) {
      await deleteFromGemini(templateGeminiFile.name);
    }
    if (submittedGeminiFile?.name) {
      await deleteFromGemini(submittedGeminiFile.name);
    }
  }
});

export default router;
