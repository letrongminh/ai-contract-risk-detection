export interface AnalysisResult {
  overall_risk: 'PASS' | 'REVIEW' | 'FAIL';
  recommended_action: string;
  overall_confidence: number;
  document_quality: {
    readability: string;
    missing_pages: number[];
    issues: string[];
  };
  field_differences: {
    field_name: string;
    template_value: string;
    submitted_value: string;
    change_type: string;
    risk: 'PASS' | 'REVIEW' | 'FAIL';
    confidence: number;
    reason: string;
    recommendation: string;
    page_refs_template: number[];
    page_refs_submitted: number[];
  }[];
  clause_differences: {
    clause_id: string;
    title: string;
    change_type: string;
    risk: 'PASS' | 'REVIEW' | 'FAIL';
    material_change: boolean;
    confidence: number;
    template_excerpt: string;
    submitted_excerpt: string;
    reason: string;
    recommendation: string;
    page_refs_template: number[];
    page_refs_submitted: number[];
  }[];
  summary: string;
}

export interface AnalysisResponse {
  jobId: string;
  result: AnalysisResult;
  error?: {
    code: string;
    message: string;
  };
}
