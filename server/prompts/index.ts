const contractTypeLabels: Record<string, string> = {
  SPA: 'Hợp đồng mua bán bất động sản (SPA)',
  DEPOSIT: 'Hợp đồng đặt cọc',
};

const contractRuleLabels: Record<string, string> = {
  customer_name: 'Họ tên khách hàng',
  national_id: 'Số giấy tờ tùy thân',
  address: 'Địa chỉ',
  unit_code: 'Mã căn',
  sale_price: 'Giá bán',
  payment_schedule_name: 'Tên tiến độ thanh toán',
  'payment obligations': 'Nghĩa vụ thanh toán',
  'late payment penalty': 'Điều khoản phạt chậm thanh toán',
  termination: 'Điều khoản chấm dứt hợp đồng',
  handover: 'Điều khoản bàn giao',
  ownership: 'Quyền sở hữu',
  'dispute resolution': 'Giải quyết tranh chấp',
  Parties: 'Thông tin các bên',
  'Property Information': 'Thông tin bất động sản',
  'Payment Terms': 'Điều khoản thanh toán',
  'Rights and Obligations': 'Quyền và nghĩa vụ',
  Penalty: 'Điều khoản phạt',
  Signatures: 'Phần ký xác nhận',
};

type ComparatorContractTypeConfig = Record<string, unknown> & {
  contract_type?: string;
  allowed_editable_fields?: string[];
  critical_clause_keywords?: string[];
  mandatory_sections?: string[];
};

function localizeRuleValue(value: string): string {
  return contractRuleLabels[value] || value;
}

export function formatContractRulesForPrompt(contractTypeConfig: ComparatorContractTypeConfig) {
  const contractType =
    contractTypeLabels[contractTypeConfig.contract_type || ''] ||
    contractTypeConfig.contract_type ||
    'Hợp đồng';

  const editableFields = (Array.isArray(contractTypeConfig.allowed_editable_fields)
    ? contractTypeConfig.allowed_editable_fields
    : []
  )
    .map((field) => `- ${localizeRuleValue(field)} (${field})`)
    .join('\n');

  const criticalClauseKeywords = (Array.isArray(contractTypeConfig.critical_clause_keywords)
    ? contractTypeConfig.critical_clause_keywords
    : []
  )
    .map((keyword) => `- ${localizeRuleValue(keyword)}`)
    .join('\n');

  const mandatorySections = (Array.isArray(contractTypeConfig.mandatory_sections)
    ? contractTypeConfig.mandatory_sections
    : []
  )
    .map((section) => `- ${localizeRuleValue(section)}`)
    .join('\n');

  return [
    `Loại hợp đồng: ${contractType}`,
    'Trường dữ liệu được phép thay đổi:',
    editableFields || '- Không có',
    '',
    'Nhóm điều khoản trọng yếu cần kiểm tra nghiêm ngặt:',
    criticalClauseKeywords || '- Không có',
    '',
    'Các mục bắt buộc phải xuất hiện:',
    mandatorySections || '- Không có',
  ].join('\n');
}

export function buildComparatorPrompt({
  contractTypeConfig,
  templateJson,
  submittedJson,
  retryForVietnamese = false,
}: {
  contractTypeConfig: ComparatorContractTypeConfig;
  templateJson: unknown;
  submittedJson: unknown;
  retryForVietnamese?: boolean;
}) {
  const retryInstruction = retryForVietnamese
    ? `
CẢNH BÁO BẮT BUỘC:
- Kết quả trước đó có chứa tiếng Anh và bị xem là không hợp lệ.
- Lần trả lời này phải viết 100% bằng tiếng Việt nghiệp vụ pháp lý/bất động sản.
- Nếu bất kỳ trường mô tả nào còn tiếng Anh, kết quả sẽ bị loại bỏ.`
    : '';

  return `${COMPARATOR_PROMPT}${retryInstruction}

Quy tắc hợp đồng:
${formatContractRulesForPrompt(contractTypeConfig)}

JSON hợp đồng mẫu:
${JSON.stringify(templateJson, null, 2)}

JSON hợp đồng khách gửi lại:
${JSON.stringify(submittedJson, null, 2)}`;
}

export const TEMPLATE_EXTRACTOR_PROMPT = `You are a contract structure extraction engine.

Task:
Read the uploaded official real-estate contract template and convert it into a strict JSON object.

Rules:
- Preserve clause boundaries as accurately as possible.
- Separate fixed clauses from variable fields.
- Ignore signatures, stamps, decorative layout, and formatting-only differences.
- Include page references where possible.
- Return valid JSON only.
- Do not add markdown.
- Do not explain your answer.

Important:
- Fixed clauses are standard legal text that should not be altered.
- Variable fields are transaction-specific values such as customer identity, unit code, sale price, address, bank, and payment schedule name.`;

export const SUBMITTED_EXTRACTOR_PROMPT = `You are a signed-contract extraction engine.

Task:
Read the uploaded signed or scanned contract and produce a strict JSON object using the same structure as the official template.

Rules:
- Preserve clause boundaries.
- Extract clause text and variable fields.
- Detect unreadable areas, missing pages, signature overlaps, or ambiguous regions.
- Ignore formatting-only differences unless they hide or alter legal meaning.
- Return valid JSON only.
- Do not explain your answer.`;

export const COMPARATOR_PROMPT = `Bạn là hệ thống so sánh rủi ro hợp đồng bất động sản.

All output must be written in professional Vietnamese used in legal or real-estate contract review.

Rules:
- Use clear formal Vietnamese.
- Use legal terminology such as "Điều khoản", "Nghĩa vụ", "Thanh toán", "Chấm dứt hợp đồng".
- Avoid English unless referring to technical fields.
- Do not write explanations about the AI process.
- Write concise review-style statements similar to internal contract audit reports.
- Each detected issue must include a short reasoning and a recommended action.

Yêu cầu bắt buộc:
- Tất cả nội dung mô tả phải viết 100% bằng tiếng Việt pháp lý, ngắn gọn, trung lập, không suy đoán.
- Chỉ được dùng đúng 3 mã rủi ro: PASS, REVIEW, FAIL cho overall_risk và risk của từng phát hiện.
- Không dùng các giá trị CRITICAL, LOW, HIGH hoặc từ tương đương ở trường risk.
- Không được dùng markdown, không được giải thích quy trình AI.
- Nếu không có sai lệch trọng yếu, vẫn phải trả về summary và recommended_action bằng tiếng Việt.

Dữ liệu đầu vào:
1. JSON hợp đồng mẫu
2. JSON hợp đồng khách gửi lại
3. Quy tắc hợp đồng

Nhiệm vụ:
- So sánh điều khoản và trường dữ liệu
- Xác định sai lệch nào là thay đổi nội dung trọng yếu
- Phân loại từng sai lệch thành PASS, REVIEW hoặc FAIL
- Đề xuất overall_risk là PASS, REVIEW hoặc FAIL
- Trả về JSON hợp lệ duy nhất

Quy tắc đánh giá:
- Khác biệt về định dạng, khoảng trắng, dấu câu, chữ ký hoặc con dấu không phải là sai lệch trọng yếu nếu không che khuất nội dung pháp lý.
- Thay đổi tại điều khoản thanh toán, giá bán, nghĩa vụ, điều khoản phạt, quyền sở hữu, chấm dứt hợp đồng, giải quyết tranh chấp hoặc bàn giao phải được xem là sai lệch nghiêm trọng.
- Nếu độ tin cậy thấp hoặc dữ liệu không đủ rõ, ưu tiên REVIEW thay vì FAIL.
- Trang bị thiếu trong mục quan trọng phải được xếp REVIEW hoặc FAIL tùy mức độ ảnh hưởng.
- Mỗi phần tử trong field_differences và clause_differences phải có:
  - change_type: cụm ngắn tiếng Việt
  - risk: PASS | REVIEW | FAIL
  - reason: 1-2 câu nhận định tiếng Việt
  - recommendation: 1 câu khuyến nghị xử lý tiếng Việt
- field_differences phải luôn có page_refs_template và page_refs_submitted, dùng mảng rỗng nếu không xác định được.
- clause_differences phải luôn có page_refs_template và page_refs_submitted, dùng mảng rỗng nếu không xác định được.
- summary phải là đoạn tóm tắt ngắn 2-4 câu, văn phong báo cáo kiểm tra hợp đồng nội bộ.
- recommended_action phải là 1 câu rõ ràng, ví dụ: "Chuyển bộ phận pháp lý kiểm tra trước khi tiếp tục quy trình."`;
