import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getEnglishLeakageFields,
  normalizeComparisonResult,
} from './normalizeComparisonResult.js';

test('normalizeComparisonResult maps legacy risks and flags English leakage', () => {
  const normalized = normalizeComparisonResult({
    overall_risk: 'LOW',
    recommended_action: 'Send to legal for review before proceeding.',
    overall_confidence: 93,
    summary: 'The payment clause was changed.',
    document_quality: {
      readability: 'medium',
      missing_pages: [],
      issues: [],
    },
    field_differences: [
      {
        field_name: 'Giá bán',
        template_value: '5.200.000.000 VND',
        submitted_value: '4.200.000.000 VND',
        change_type: 'field value changed',
        risk: 'LOW',
        confidence: 0.8,
        reason: 'The submitted value is lower than the template value.',
        recommendation: 'Requires manual review before proceeding.',
      },
    ],
    clause_differences: [
      {
        clause_id: 'Điều 3.1',
        title: 'Thanh toán',
        change_type: 'clause text modified',
        risk: 'CRITICAL',
        material_change: true,
        confidence: 0.92,
        template_excerpt: 'Thanh toán trong vòng 30 ngày.',
        submitted_excerpt: 'Thanh toán trong vòng 90 ngày.',
        reason: 'The payment deadline has been extended.',
        recommendation: 'Escalate to legal review before proceeding.',
        page_refs_template: [8],
        page_refs_submitted: [8],
      },
    ],
  });

  assert.equal(normalized.overall_risk, 'FAIL');
  assert.equal(normalized.field_differences[0].risk, 'PASS');
  assert.equal(normalized.clause_differences[0].risk, 'FAIL');
  assert.equal(normalized.document_quality.readability, 'Trung bình');

  const leakageFields = getEnglishLeakageFields(normalized);
  assert.deepEqual(leakageFields, [
    'summary',
    'field_differences[0].reason',
    'clause_differences[0].reason',
  ]);
});

test('normalizeComparisonResult provides safe defaults for missing page refs and document quality', () => {
  const normalized = normalizeComparisonResult({
    overall_risk: 'PASS',
    field_differences: [
      {
        field_name: 'Giá bán',
        template_value: '5.200.000.000 VND',
        submitted_value: '5.200.000.000 VND',
        change_type: 'Sai lệch dữ liệu',
        risk: 'PASS',
        confidence: 85,
        reason: 'Không phát hiện sai lệch trọng yếu.',
        recommendation: 'Có thể tiếp tục kiểm tra theo quy trình thông thường.',
      },
    ],
    clause_differences: [],
  });

  assert.equal(normalized.document_quality.readability, 'Trung bình');
  assert.deepEqual(normalized.document_quality.missing_pages, []);
  assert.deepEqual(normalized.document_quality.issues, []);
  assert.deepEqual(normalized.field_differences[0].page_refs_template, []);
  assert.deepEqual(normalized.field_differences[0].page_refs_submitted, []);
  assert.equal(normalized.field_differences[0].confidence, 0.85);
});

test('normalizeComparisonResult upgrades overall risk when document quality has issues', () => {
  const normalized = normalizeComparisonResult({
    overall_risk: 'PASS',
    recommended_action: '',
    overall_confidence: 0.81,
    summary: '',
    document_quality: {
      readability: 'low',
      missing_pages: [12],
      issues: ['Chữ ký che một phần nội dung tại trang 12'],
    },
    field_differences: [],
    clause_differences: [],
  });

  assert.equal(normalized.overall_risk, 'REVIEW');
  assert.equal(normalized.document_quality.readability, 'Thấp');
  assert.equal(
    normalized.recommended_action,
    'Cần kiểm tra thêm trước khi tiếp tục xử lý.',
  );
});
