type RiskCode = 'PASS' | 'REVIEW' | 'FAIL';

interface RawDocumentQuality {
  readability?: unknown;
  missing_pages?: unknown;
  issues?: unknown;
}

interface RawFieldDifference {
  field_name?: unknown;
  template_value?: unknown;
  submitted_value?: unknown;
  change_type?: unknown;
  risk?: unknown;
  confidence?: unknown;
  reason?: unknown;
  recommendation?: unknown;
  page_refs_template?: unknown;
  page_refs_submitted?: unknown;
}

interface RawClauseDifference {
  clause_id?: unknown;
  title?: unknown;
  change_type?: unknown;
  risk?: unknown;
  material_change?: unknown;
  confidence?: unknown;
  template_excerpt?: unknown;
  submitted_excerpt?: unknown;
  reason?: unknown;
  recommendation?: unknown;
  page_refs_template?: unknown;
  page_refs_submitted?: unknown;
}

interface RawComparisonResult {
  overall_risk?: unknown;
  recommended_action?: unknown;
  overall_confidence?: unknown;
  document_quality?: RawDocumentQuality;
  field_differences?: RawFieldDifference[];
  clause_differences?: RawClauseDifference[];
  summary?: unknown;
}

export interface NormalizedComparisonResult {
  overall_risk: RiskCode;
  recommended_action: string;
  overall_confidence: number;
  document_quality: {
    readability: string;
    missing_pages: number[];
    issues: string[];
  };
  field_differences: Array<{
    field_name: string;
    template_value: string;
    submitted_value: string;
    change_type: string;
    risk: RiskCode;
    confidence: number;
    reason: string;
    recommendation: string;
    page_refs_template: number[];
    page_refs_submitted: number[];
  }>;
  clause_differences: Array<{
    clause_id: string;
    title: string;
    change_type: string;
    risk: RiskCode;
    material_change: boolean;
    confidence: number;
    template_excerpt: string;
    submitted_excerpt: string;
    reason: string;
    recommendation: string;
    page_refs_template: number[];
    page_refs_submitted: number[];
  }>;
  summary: string;
}

const exactTranslations: Record<string, string> = {
  'clause text modified': 'Nội dung điều khoản bị chỉnh sửa',
  'field value changed': 'Giá trị trường dữ liệu bị thay đổi',
  'field updated': 'Giá trị trường dữ liệu bị cập nhật',
  'value mismatch': 'Giá trị không khớp',
  'missing clause': 'Thiếu điều khoản',
  'missing field': 'Thiếu trường dữ liệu',
  'page missing': 'Thiếu trang',
  'formatting only': 'Khác biệt hình thức',
  'document issue': 'Vấn đề chất lượng tài liệu',
  'escalate to legal review before proceeding.':
    'Chuyển bộ phận pháp lý kiểm tra trước khi tiếp tục quy trình.',
  'send to legal for review before proceeding.':
    'Chuyển bộ phận pháp lý kiểm tra trước khi tiếp tục quy trình.',
  'requires manual review before proceeding.':
    'Cần kiểm tra thêm trước khi tiếp tục quy trình.',
  'proceed under standard approval flow.':
    'Có thể tiếp tục quy trình theo bước phê duyệt thông thường.',
  'no issues detected.': 'Không phát hiện vấn đề cần lưu ý.',
  'no issues detected': 'Không phát hiện vấn đề cần lưu ý.',
  'none detected': 'Không phát hiện',
};

const englishLeakagePatterns = [
  /\bpayment\b/i,
  /\bclause\b/i,
  /\bcontract\b/i,
  /\btemplate\b/i,
  /\bsubmitted\b/i,
  /\bfield\b/i,
  /\bdifference\b/i,
  /\bmissing\b/i,
  /\bpage\b/i,
  /\breadability\b/i,
  /\bissue\b/i,
  /\brecommend(?:ed|ation)?\b/i,
  /\breview\b/i,
  /\bcritical\b/i,
  /\bchanged?\b/i,
  /\bmodified\b/i,
  /\bvalue\b/i,
  /\bobligation\b/i,
  /\bownership\b/i,
  /\btermination\b/i,
  /\bsummary\b/i,
  /\bdocument\b/i,
  /\blegal\b/i,
  /\bdetected\b/i,
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function stripDiacritics(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function normalizeLookupKey(value: string) {
  return normalizeWhitespace(stripDiacritics(value).toLowerCase());
}

function asString(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const translated = exactTranslations[normalizeLookupKey(value)];
    return normalizeWhitespace(translated || value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return fallback;
}

function normalizeConfidence(value: unknown) {
  const rawValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 0;
  }

  if (rawValue > 1 && rawValue <= 100) {
    return Number((rawValue / 100).toFixed(4));
  }

  if (rawValue > 1) {
    return 1;
  }

  return Number(rawValue.toFixed(4));
}

function normalizePageRefs(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as number[];
  }

  return Array.from(
    new Set(
      value
        .map((pageRef) => Number(pageRef))
        .filter((pageRef) => Number.isInteger(pageRef) && pageRef > 0),
    ),
  ).sort((left, right) => left - right);
}

function normalizeRisk(value: unknown, fallback: RiskCode = 'REVIEW'): RiskCode {
  const normalizedValue = normalizeLookupKey(asString(value));

  if (!normalizedValue) {
    return fallback;
  }

  if (
    ['pass', 'low', 'safe', 'none', 'khong phat hien sai lech trong yeu', 'hop le'].includes(
      normalizedValue,
    )
  ) {
    return 'PASS';
  }

  if (
    ['fail', 'critical', 'high', 'nghiem trong', 'sai lech nghiem trong'].includes(
      normalizedValue,
    )
  ) {
    return 'FAIL';
  }

  if (
    [
      'review',
      'medium',
      'warning',
      'warn',
      'can kiem tra them',
      'requires review',
      'manual review',
    ].includes(normalizedValue)
  ) {
    return 'REVIEW';
  }

  return fallback;
}

function getMaxRisk(...risks: RiskCode[]): RiskCode {
  if (risks.includes('FAIL')) {
    return 'FAIL';
  }

  if (risks.includes('REVIEW')) {
    return 'REVIEW';
  }

  return 'PASS';
}

function normalizeReadability(value: unknown) {
  const normalizedValue = normalizeLookupKey(asString(value));

  if (!normalizedValue) {
    return 'Trung bình';
  }

  if (['high', 'cao', 'tot', 'ro rang'].includes(normalizedValue)) {
    return 'Cao';
  }

  if (['low', 'thap', 'kem'].includes(normalizedValue)) {
    return 'Thấp';
  }

  if (['medium', 'trung binh', 'average'].includes(normalizedValue)) {
    return 'Trung bình';
  }

  return asString(value, 'Trung bình');
}

function getDefaultAction(risk: RiskCode) {
  if (risk === 'FAIL') {
    return 'Chuyển bộ phận pháp lý kiểm tra trước khi tiếp tục quy trình.';
  }

  if (risk === 'REVIEW') {
    return 'Cần kiểm tra thêm trước khi tiếp tục xử lý.';
  }

  return 'Có thể tiếp tục quy trình theo bước phê duyệt thông thường.';
}

function getDefaultRecommendation(risk: RiskCode) {
  if (risk === 'FAIL') {
    return 'Cần kiểm tra lại hợp đồng trước khi tiếp tục xử lý.';
  }

  if (risk === 'REVIEW') {
    return 'Cần đối chiếu thêm với hồ sơ gốc trước khi quyết định.';
  }

  return 'Có thể tiếp tục kiểm tra theo quy trình thông thường.';
}

function getDefaultSummary(result: {
  overallRisk: RiskCode;
  clauseCount: number;
  fieldCount: number;
}) {
  if (result.overallRisk === 'PASS') {
    return 'Không phát hiện sai lệch trọng yếu giữa hợp đồng mẫu và hợp đồng khách gửi lại.';
  }

  const fragments = [];

  if (result.clauseCount > 0) {
    fragments.push(`Phát hiện ${result.clauseCount} sai lệch điều khoản cần lưu ý.`);
  }

  if (result.fieldCount > 0) {
    fragments.push(`Phát hiện ${result.fieldCount} sai lệch dữ liệu cần đối chiếu.`);
  }

  if (!fragments.length) {
    fragments.push('Phát hiện sai lệch cần kiểm tra thêm trước khi tiếp tục xử lý.');
  }

  return fragments.join(' ');
}

function normalizeDocumentQuality(rawDocumentQuality: RawDocumentQuality | undefined) {
  const readability = normalizeReadability(rawDocumentQuality?.readability);
  const missingPages = normalizePageRefs(rawDocumentQuality?.missing_pages);
  const rawIssues = Array.isArray(rawDocumentQuality?.issues) ? rawDocumentQuality.issues : [];
  const issues = rawIssues.map((issue) => asString(issue)).filter(Boolean);

  return {
    readability: readability || 'Trung bình',
    missing_pages: missingPages,
    issues,
  };
}

export function normalizeComparisonResult(rawResult: RawComparisonResult): NormalizedComparisonResult {
  const declaredOverallRisk = normalizeRisk(rawResult.overall_risk, 'REVIEW');

  const fieldDifferences = Array.isArray(rawResult.field_differences)
    ? rawResult.field_differences.map((difference) => {
        const risk = normalizeRisk(difference.risk, declaredOverallRisk);

        return {
          field_name: asString(difference.field_name, 'Trường dữ liệu chưa xác định'),
          template_value: asString(difference.template_value),
          submitted_value: asString(difference.submitted_value),
          change_type: asString(difference.change_type, 'Sai lệch dữ liệu'),
          risk,
          confidence: normalizeConfidence(difference.confidence),
          reason: asString(difference.reason, 'Cần kiểm tra thêm để xác định mức độ ảnh hưởng của sai lệch.'),
          recommendation: asString(difference.recommendation, getDefaultRecommendation(risk)),
          page_refs_template: normalizePageRefs(difference.page_refs_template),
          page_refs_submitted: normalizePageRefs(difference.page_refs_submitted),
        };
      })
    : [];

  const clauseDifferences = Array.isArray(rawResult.clause_differences)
    ? rawResult.clause_differences.map((difference) => {
        const risk = normalizeRisk(difference.risk, declaredOverallRisk);

        return {
          clause_id: asString(difference.clause_id, 'Điều khoản chưa xác định'),
          title: asString(difference.title, 'Nội dung chưa xác định'),
          change_type: asString(difference.change_type, 'Nội dung điều khoản bị chỉnh sửa'),
          risk,
          material_change: Boolean(difference.material_change),
          confidence: normalizeConfidence(difference.confidence),
          template_excerpt: asString(difference.template_excerpt),
          submitted_excerpt: asString(difference.submitted_excerpt),
          reason: asString(difference.reason, 'Cần kiểm tra thêm để đánh giá đầy đủ tác động của thay đổi này.'),
          recommendation: asString(difference.recommendation, getDefaultRecommendation(risk)),
          page_refs_template: normalizePageRefs(difference.page_refs_template),
          page_refs_submitted: normalizePageRefs(difference.page_refs_submitted),
        };
      })
    : [];

  const normalizedDocumentQuality = normalizeDocumentQuality(rawResult.document_quality);
  const overallConfidence = normalizeConfidence(rawResult.overall_confidence);
  const issueRisk = getMaxRisk(
    ...fieldDifferences.map((difference) => difference.risk),
    ...clauseDifferences.map((difference) => difference.risk),
  );
  const overallRisk = getMaxRisk(declaredOverallRisk, issueRisk);
  const overallRiskWithDocumentQuality =
    overallRisk === 'PASS' &&
    (normalizedDocumentQuality.missing_pages.length > 0 || normalizedDocumentQuality.issues.length > 0)
      ? 'REVIEW'
      : overallRisk;

  return {
    overall_risk: overallRiskWithDocumentQuality,
    recommended_action: asString(
      rawResult.recommended_action,
      getDefaultAction(overallRiskWithDocumentQuality),
    ),
    overall_confidence: overallConfidence || 0,
    document_quality: normalizedDocumentQuality,
    field_differences: fieldDifferences,
    clause_differences: clauseDifferences,
    summary: asString(
      rawResult.summary,
      getDefaultSummary({
        overallRisk: overallRiskWithDocumentQuality,
        clauseCount: clauseDifferences.length,
        fieldCount: fieldDifferences.length,
      }),
    ),
  };
}

function textHasEnglishLeakage(value: string) {
  if (!value) {
    return false;
  }

  return englishLeakagePatterns.some((pattern) => pattern.test(value));
}

export function getEnglishLeakageFields(result: NormalizedComparisonResult) {
  const leakageFields: string[] = [];

  if (textHasEnglishLeakage(result.recommended_action)) {
    leakageFields.push('recommended_action');
  }

  if (textHasEnglishLeakage(result.summary)) {
    leakageFields.push('summary');
  }

  if (textHasEnglishLeakage(result.document_quality.readability)) {
    leakageFields.push('document_quality.readability');
  }

  if (result.document_quality.issues.some((issue) => textHasEnglishLeakage(issue))) {
    leakageFields.push('document_quality.issues');
  }

  result.field_differences.forEach((difference, index) => {
    if (textHasEnglishLeakage(difference.change_type)) {
      leakageFields.push(`field_differences[${index}].change_type`);
    }

    if (textHasEnglishLeakage(difference.reason)) {
      leakageFields.push(`field_differences[${index}].reason`);
    }

    if (textHasEnglishLeakage(difference.recommendation)) {
      leakageFields.push(`field_differences[${index}].recommendation`);
    }
  });

  result.clause_differences.forEach((difference, index) => {
    if (textHasEnglishLeakage(difference.change_type)) {
      leakageFields.push(`clause_differences[${index}].change_type`);
    }

    if (textHasEnglishLeakage(difference.reason)) {
      leakageFields.push(`clause_differences[${index}].reason`);
    }

    if (textHasEnglishLeakage(difference.recommendation)) {
      leakageFields.push(`clause_differences[${index}].recommendation`);
    }
  });

  return leakageFields;
}
