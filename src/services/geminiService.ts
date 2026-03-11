import type { AnalysisResponse, AnalysisResult } from '../types';

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as AnalysisResponse;
    return payload.error?.message || `Yêu cầu thất bại với mã trạng thái ${response.status}`;
  } catch {
    return `Yêu cầu thất bại với mã trạng thái ${response.status}`;
  }
}

export async function analyzeContracts(
  templateFile: File,
  submittedFile: File,
  contractType: string,
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('templateFile', templateFile);
  formData.append('submittedFile', submittedFile);
  formData.append('contractType', contractType);

  const response = await fetch('/api/analyze', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const payload = (await response.json()) as AnalysisResponse;

  if (!payload.result) {
    throw new Error('Phản hồi phân tích không chứa kết quả hợp lệ.');
  }

  return payload.result;
}
