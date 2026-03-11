import type { AnalysisResult } from '../types';

type RiskLevel = AnalysisResult['overall_risk'];

const riskDescriptions: Record<RiskLevel, string> = {
  PASS: 'Không phát hiện sai lệch trọng yếu',
  REVIEW: 'Cần kiểm tra thêm',
  FAIL: 'Phát hiện sai lệch nghiêm trọng',
};

const riskValueLabels: Record<RiskLevel, string> = {
  PASS: 'Không phát hiện sai lệch trọng yếu',
  REVIEW: 'Cần kiểm tra thêm',
  FAIL: 'Nghiêm trọng',
};

export function getRiskBadgeText(risk: RiskLevel) {
  return `${risk} — ${riskDescriptions[risk]}`;
}

export function getRiskValueLabel(risk: RiskLevel) {
  return riskValueLabels[risk];
}

export function getRiskTone(risk: RiskLevel) {
  if (risk === 'FAIL') {
    return {
      surface: 'border-red-200 bg-red-50/90',
      accent: 'bg-red-600 text-white',
      badge: 'bg-red-100 text-red-800 border-red-200',
      icon: 'text-red-600',
      text: 'text-red-900',
      soft: 'bg-red-100/80 text-red-900',
    };
  }

  if (risk === 'REVIEW') {
    return {
      surface: 'border-amber-200 bg-amber-50/90',
      accent: 'bg-amber-500 text-slate-950',
      badge: 'bg-amber-100 text-amber-900 border-amber-200',
      icon: 'text-amber-600',
      text: 'text-amber-900',
      soft: 'bg-amber-100/80 text-amber-900',
    };
  }

  return {
    surface: 'border-emerald-200 bg-emerald-50/90',
    accent: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-900',
    soft: 'bg-emerald-100/80 text-emerald-900',
  };
}

export function formatConfidence(value: number) {
  const normalizedValue = value > 1 ? Math.min(value, 100) : value * 100;
  return `${Math.round(normalizedValue)}%`;
}

export function formatPageRefs(pageRefs: number[]) {
  if (!pageRefs.length) {
    return 'Chưa xác định';
  }

  return pageRefs.join(', ');
}

export function buildFullReport(result: AnalysisResult) {
  const lines = [
    'KẾT QUẢ KIỂM TRA HỢP ĐỒNG',
    '',
    'Mức độ rủi ro tổng thể:',
    getRiskBadgeText(result.overall_risk),
    '',
    'Khuyến nghị xử lý:',
    result.recommended_action,
    '',
    'Tóm tắt phát hiện:',
    result.summary,
    '',
    'Phát hiện chi tiết:',
  ];

  const detailLines = [
    ...result.clause_differences.map(
      (difference) =>
        `- ${difference.clause_id} – ${difference.title}: ${difference.reason} Khuyến nghị: ${difference.recommendation}`,
    ),
    ...result.field_differences.map(
      (difference) =>
        `- Trường dữ liệu ${difference.field_name}: ${difference.reason} Khuyến nghị: ${difference.recommendation}`,
    ),
  ];

  if (!detailLines.length) {
    detailLines.push('- Không phát hiện sai lệch trọng yếu cần xử lý thêm.');
  }

  if (result.document_quality.missing_pages.length) {
    detailLines.push(
      `- Trang bị thiếu: ${formatPageRefs(result.document_quality.missing_pages)}.`,
    );
  }

  if (result.document_quality.issues.length) {
    result.document_quality.issues.forEach((issue) => {
      detailLines.push(`- Vấn đề chất lượng tài liệu: ${issue}`);
    });
  }

  return [...lines, ...detailLines].join('\n');
}
