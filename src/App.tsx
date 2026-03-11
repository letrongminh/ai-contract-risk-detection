import { useState, type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Upload,
  XCircle,
} from 'lucide-react';
import { diffWords } from 'diff';
import { analyzeContracts } from './services/geminiService';
import { cn } from './lib/utils';
import {
  buildFullReport,
  formatConfidence,
  formatPageRefs,
  getRiskBadgeText,
  getRiskTone,
  getRiskValueLabel,
} from './lib/analysisPresentation';
import type { AnalysisResult } from './types';

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const diff = diffWords(oldText, newText);

  return (
    <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
      {diff.map((part, index) => {
        if (part.added) {
          return (
            <span
              key={index}
              className="rounded bg-emerald-100 px-1 font-semibold text-emerald-900"
            >
              [{part.value}]
            </span>
          );
        }

        if (part.removed) {
          return (
            <span
              key={index}
              className="rounded bg-red-100 px-1 text-red-800 line-through opacity-80"
            >
              [{part.value}]
            </span>
          );
        }

        return (
          <span key={index} className="text-slate-700">
            {part.value}
          </span>
        );
      })}
    </div>
  );
}

function SectionCard({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-36 rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-[0_24px_70px_-32px_rgba(15,23,42,0.28)] backdrop-blur"
    >
      <div className="mb-5 flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{subtitle}</p>
        <h3 className="font-serif text-2xl text-slate-950">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm leading-7 text-slate-600">
      {message}
    </div>
  );
}

function getClauseKey(difference: AnalysisResult['clause_differences'][number], index: number) {
  return `${difference.clause_id}-${index}`;
}

function getFieldKey(difference: AnalysisResult['field_differences'][number], index: number) {
  return `${difference.field_name}-${index}`;
}

function buildInitialClauseState(result: AnalysisResult) {
  return Object.fromEntries(
    result.clause_differences.map((difference, index) => [
      getClauseKey(difference, index),
      difference.risk === 'FAIL',
    ]),
  );
}

function buildInitialFieldState(result: AnalysisResult) {
  return Object.fromEntries(
    result.field_differences.map((difference, index) => [getFieldKey(difference, index), false]),
  );
}

export default function App() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [submittedFile, setSubmittedFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState('SPA');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Record<string, boolean>>({});
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const toggleClause = (key: string) => {
    setExpandedClauses((previousState) => ({ ...previousState, [key]: !previousState[key] }));
  };

  const toggleField = (key: string) => {
    setExpandedFields((previousState) => ({ ...previousState, [key]: !previousState[key] }));
  };

  const handleAnalyze = async () => {
    if (!templateFile || !submittedFile) {
      setError('Vui lòng tải lên đầy đủ hợp đồng mẫu và hợp đồng khách gửi.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setExpandedClauses({});
    setExpandedFields({});

    try {
      const analysisResult = await analyzeContracts(templateFile, submittedFile, contractType);
      setResult(analysisResult);
      setExpandedClauses(buildInitialClauseState(analysisResult));
      setExpandedFields(buildInitialFieldState(analysisResult));
    } catch (analysisError: any) {
      console.error('Analysis error:', analysisError);
      setError(analysisError.message || 'Đã xảy ra lỗi trong quá trình kiểm tra hợp đồng.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setExpandedClauses({});
    setExpandedFields({});
  };

  const handleDownloadJson = () => {
    if (!result) {
      return;
    }

    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(result, null, 2))}`;
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', 'bao_cao_rui_ro_hop_dong.json');
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const criticalClauses =
    result?.clause_differences
      .map((difference, index) => ({ difference, index }))
      .filter(({ difference }) => difference.risk === 'FAIL') || [];
  const reviewClauses =
    result?.clause_differences
      .map((difference, index) => ({ difference, index }))
      .filter(({ difference }) => difference.risk === 'REVIEW') || [];
  const fieldDifferences = result?.field_differences || [];
  const criticalCount =
    criticalClauses.length +
    fieldDifferences.filter((difference) => difference.risk === 'FAIL').length;
  const reviewCount =
    reviewClauses.length +
    fieldDifferences.filter((difference) => difference.risk === 'REVIEW').length;
  const documentIssueCount =
    (result?.document_quality.issues.length || 0) +
    (result?.document_quality.missing_pages.length || 0);
  const fullReport = result ? buildFullReport(result) : '';

  return (
    <div className="min-h-screen bg-transparent pb-16 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-[rgba(247,243,236,0.88)] px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-900/15">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                Bảng điều khiển kiểm tra hợp đồng
              </p>
              <h1 className="font-serif text-2xl text-slate-950">Kiểm tra rủi ro hợp đồng</h1>
            </div>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Kiểm tra mới
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
        {!result && !isAnalyzing && (
          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-white/80 bg-white/88 p-8 shadow-[0_28px_80px_-36px_rgba(15,23,42,0.36)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                Báo cáo tiếng Việt pháp lý
              </p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight text-slate-950">
                Đối chiếu hợp đồng mẫu và hợp đồng khách gửi bằng báo cáo kiểm tra nội bộ.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                Hệ thống hiển thị mức độ rủi ro, điều khoản bị sửa, sai lệch dữ liệu và chất
                lượng tài liệu theo giao diện kiểm tra dành cho bộ phận pháp lý và vận hành.
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-600">
                    FAIL
                  </p>
                  <p className="mt-2 text-sm leading-7 text-red-900">
                    Phát hiện sai lệch nghiêm trọng cần chuyển bộ phận pháp lý kiểm tra.
                  </p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    REVIEW
                  </p>
                  <p className="mt-2 text-sm leading-7 text-amber-900">
                    Có điểm cần kiểm tra thêm hoặc chưa đủ rõ để kết luận ngay.
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    PASS
                  </p>
                  <p className="mt-2 text-sm leading-7 text-emerald-900">
                    Không phát hiện sai lệch trọng yếu và có thể tiếp tục quy trình thông thường.
                  </p>
                </div>
              </div>
            </div>

            <section className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,247,241,0.96))] p-8 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)]">
              <h3 className="font-serif text-2xl text-slate-950">Bắt đầu kiểm tra</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Tải lên đúng cặp tài liệu để hệ thống trích xuất, đối chiếu và lập báo cáo bằng
                tiếng Việt nghiệp vụ pháp lý.
              </p>

              <div className="mt-6 space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Loại hợp đồng</label>
                  <select
                    value={contractType}
                    onChange={(event) => setContractType(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-950"
                  >
                    <option value="SPA">Hợp đồng Mua bán (SPA)</option>
                    <option value="DEPOSIT">Hợp đồng Đặt cọc</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400" />
                    <h4 className="mt-3 font-medium text-slate-900">Hợp đồng mẫu</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Bản mẫu chính thức dùng làm cơ sở đối chiếu.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
                      className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-800"
                    />
                    {templateFile && (
                      <p className="mt-3 text-sm font-medium text-emerald-700">{templateFile.name}</p>
                    )}
                  </div>

                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400" />
                    <h4 className="mt-3 font-medium text-slate-900">Hợp đồng khách gửi</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      Bản khách hàng gửi lại để kiểm tra sai lệch và rủi ro.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,image/jpeg,image/png"
                      onChange={(event) => setSubmittedFile(event.target.files?.[0] || null)}
                      className="mt-4 block w-full text-sm text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-800"
                    />
                    {submittedFile && (
                      <p className="mt-3 text-sm font-medium text-emerald-700">{submittedFile.name}</p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="text-sm leading-7">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAnalyze}
                  disabled={!templateFile || !submittedFile}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Phân tích hợp đồng
                </button>
              </div>
            </section>
          </section>
        )}

        {isAnalyzing && (
          <section className="rounded-[32px] border border-white/80 bg-white/92 p-12 text-center shadow-[0_24px_70px_-34px_rgba(15,23,42,0.28)]">
            <div className="mx-auto h-16 w-16 rounded-full border-4 border-slate-200 border-t-slate-950 animate-spin" />
            <h2 className="mt-6 font-serif text-3xl text-slate-950">Đang kiểm tra hợp đồng</h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              Hệ thống đang trích xuất nội dung, đối chiếu điều khoản và lập báo cáo rủi ro.
            </p>
            <p className="mt-2 text-sm text-slate-400">Quá trình này có thể mất đến 2 phút.</p>
          </section>
        )}

        {result && !isAnalyzing && (
          <>
            <nav className="sticky top-[88px] z-20 flex flex-wrap gap-3 rounded-full border border-white/80 bg-[rgba(255,255,255,0.85)] px-4 py-3 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.3)] backdrop-blur">
              {[
                ['summary', 'Tóm tắt'],
                ['critical-changes', 'Sai lệch nghiêm trọng'],
                ['review-needed', 'Cần kiểm tra thêm'],
                ['field-differences', 'Sai lệch dữ liệu'],
                ['document-quality', 'Chất lượng tài liệu'],
                ['full-report', 'Báo cáo tổng hợp'],
              ].map(([target, label]) => (
                <a
                  key={target}
                  href={`#${target}`}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-900 hover:text-white"
                >
                  {label}
                </a>
              ))}
            </nav>

            <SectionCard id="summary" title="Kết quả kiểm tra hợp đồng" subtitle="Tổng quan">
              <div
                className={cn(
                  'rounded-[28px] border p-6 shadow-inner shadow-white/50',
                  getRiskTone(result.overall_risk).surface,
                )}
              >
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start gap-4">
                      <div
                        className={cn(
                          'inline-flex rounded-full px-4 py-2 text-sm font-semibold',
                          getRiskTone(result.overall_risk).accent,
                        )}
                      >
                        {getRiskBadgeText(result.overall_risk)}
                      </div>
                      <div className="rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700">
                        Độ tin cậy phân tích: {formatConfidence(result.overall_confidence)}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Mức độ rủi ro
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">
                          {getRiskValueLabel(result.overall_risk)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Sai lệch nghiêm trọng
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{criticalCount}</p>
                      </div>
                      <div className="rounded-2xl border border-white/70 bg-white/85 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Cần kiểm tra thêm
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{reviewCount}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/70 bg-white/90 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Khuyến nghị xử lý
                    </p>
                    <p className="mt-3 text-base leading-8 text-slate-900">
                      {result.recommended_action}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                        {criticalCount} sai lệch nghiêm trọng
                      </div>
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                        {reviewCount} sai lệch cần kiểm tra
                      </div>
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                        {fieldDifferences.length} sai lệch dữ liệu
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-white/75 bg-white/92 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Tóm tắt phát hiện
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-lg leading-9 text-slate-900">
                    {result.summary}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              id="critical-changes"
              title="Sai lệch nghiêm trọng"
              subtitle="Sai lệch phát hiện"
            >
              <div className="space-y-4">
                {criticalClauses.length === 0 && (
                  <EmptyState message="Không phát hiện điều khoản nào ở mức nghiêm trọng." />
                )}

                {criticalClauses.map(({ difference, index }) => {
                  const key = getClauseKey(difference, index);
                  const isExpanded = expandedClauses[key] !== false;
                  const tone = getRiskTone(difference.risk);

                  return (
                    <article
                      key={key}
                      className={cn(
                        'overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_55px_-35px_rgba(15,23,42,0.35)]',
                        tone.surface,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleClause(key)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Điều khoản
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-slate-950">
                            {difference.clause_id} – {difference.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                              tone.badge,
                            )}
                          >
                            {getRiskValueLabel(difference.risk)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-6 border-t border-white/70 bg-white/88 px-5 py-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Loại sai lệch
                              </p>
                              <p className="mt-2 text-base text-slate-900">{difference.change_type}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Mức độ rủi ro
                              </p>
                              <p className="mt-2 text-base text-slate-900">
                                {getRiskValueLabel(difference.risk)}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-5 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nội dung trong hợp đồng mẫu
                              </p>
                              <div className="mt-3 whitespace-pre-wrap font-mono text-sm leading-7 text-slate-700">
                                {difference.template_excerpt || 'Không có dữ liệu trích dẫn.'}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nội dung trong hợp đồng khách gửi
                              </p>
                              <div className="mt-3">
                                <DiffViewer
                                  oldText={difference.template_excerpt}
                                  newText={difference.submitted_excerpt}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nhận định
                              </p>
                              <p className="mt-2 text-base leading-8 text-slate-900">{difference.reason}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Khuyến nghị
                              </p>
                              <p className="mt-2 text-base leading-8 text-slate-900">
                                {difference.recommendation}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Trang hợp đồng mẫu
                              </p>
                              <p className="mt-2">Trang {formatPageRefs(difference.page_refs_template)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Trang hợp đồng khách gửi
                              </p>
                              <p className="mt-2">Trang {formatPageRefs(difference.page_refs_submitted)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              id="review-needed"
              title="Cần kiểm tra thêm"
              subtitle="Cần đối chiếu"
            >
              <div className="space-y-4">
                {reviewClauses.length === 0 && (
                  <EmptyState message="Không có điều khoản nào ở trạng thái cần kiểm tra thêm." />
                )}

                {reviewClauses.map(({ difference, index }) => {
                  const key = getClauseKey(difference, index);
                  const isExpanded = expandedClauses[key] === true;
                  const tone = getRiskTone(difference.risk);

                  return (
                    <article
                      key={key}
                      className={cn(
                        'overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_55px_-35px_rgba(15,23,42,0.35)]',
                        tone.surface,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleClause(key)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Điều khoản
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-slate-950">
                            {difference.clause_id} – {difference.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                              tone.badge,
                            )}
                          >
                            {getRiskValueLabel(difference.risk)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-6 border-t border-white/70 bg-white/88 px-5 py-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Loại sai lệch
                              </p>
                              <p className="mt-2 text-base text-slate-900">{difference.change_type}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Mức độ rủi ro
                              </p>
                              <p className="mt-2 text-base text-slate-900">
                                {getRiskValueLabel(difference.risk)}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-5 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nội dung trong hợp đồng mẫu
                              </p>
                              <div className="mt-3 whitespace-pre-wrap font-mono text-sm leading-7 text-slate-700">
                                {difference.template_excerpt || 'Không có dữ liệu trích dẫn.'}
                              </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nội dung trong hợp đồng khách gửi
                              </p>
                              <div className="mt-3">
                                <DiffViewer
                                  oldText={difference.template_excerpt}
                                  newText={difference.submitted_excerpt}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nhận định
                              </p>
                              <p className="mt-2 text-base leading-8 text-slate-900">{difference.reason}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Khuyến nghị
                              </p>
                              <p className="mt-2 text-base leading-8 text-slate-900">
                                {difference.recommendation}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Trang hợp đồng mẫu
                              </p>
                              <p className="mt-2">Trang {formatPageRefs(difference.page_refs_template)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Trang hợp đồng khách gửi
                              </p>
                              <p className="mt-2">Trang {formatPageRefs(difference.page_refs_submitted)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              id="field-differences"
              title="Sai lệch dữ liệu"
              subtitle="Sai lệch dữ liệu"
            >
              <div className="space-y-4">
                {fieldDifferences.length === 0 && (
                  <EmptyState message="Không phát hiện sai lệch dữ liệu giữa hợp đồng mẫu và hợp đồng khách gửi." />
                )}

                {fieldDifferences.map((difference, index) => {
                  const key = getFieldKey(difference, index);
                  const isExpanded = expandedFields[key] === true;
                  const tone = getRiskTone(difference.risk);

                  return (
                    <article
                      key={key}
                      className={cn(
                        'overflow-hidden rounded-[24px] border bg-white shadow-[0_18px_55px_-35px_rgba(15,23,42,0.35)]',
                        tone.surface,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleField(key)}
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            Trường dữ liệu
                          </p>
                          <h4 className="mt-1 text-lg font-semibold text-slate-950">
                            {difference.field_name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                              tone.badge,
                            )}
                          >
                            {getRiskValueLabel(difference.risk)}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="space-y-6 border-t border-white/70 bg-white/88 px-5 py-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Loại sai lệch
                              </p>
                              <p className="mt-2 text-base text-slate-900">{difference.change_type}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Mức độ rủi ro
                              </p>
                              <p className="mt-2 text-base text-slate-900">
                                {getRiskValueLabel(difference.risk)}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-5 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Hợp đồng mẫu
                              </p>
                              <p className="mt-3 font-mono text-sm leading-7 text-slate-700">
                                {difference.template_value || 'Không có dữ liệu.'}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Hợp đồng khách gửi
                              </p>
                              <p className="mt-3 font-mono text-sm leading-7 text-slate-900">
                                {difference.submitted_value || 'Không có dữ liệu.'}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Nhận định
                              </p>
                              <p className="mt-2 text-base leading-8 text-slate-900">{difference.reason}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Khuyến nghị
                              </p>
                              <p className="mt-2 text-base leading-8 text-slate-900">
                                {difference.recommendation}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Trang hợp đồng mẫu
                              </p>
                              <p className="mt-2">Trang {formatPageRefs(difference.page_refs_template)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Trang hợp đồng khách gửi
                              </p>
                              <p className="mt-2">Trang {formatPageRefs(difference.page_refs_submitted)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              id="document-quality"
              title="Chất lượng tài liệu"
              subtitle="Chất lượng tài liệu"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Khả năng đọc
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {result.document_quality.readability}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Trang thiếu
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {result.document_quality.missing_pages.length
                      ? formatPageRefs(result.document_quality.missing_pages)
                      : 'Không phát hiện'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Số vấn đề phát hiện
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{documentIssueCount}</p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Vấn đề phát hiện
                </p>
                {result.document_quality.issues.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {result.document_quality.issues.map((issue, index) => (
                      <div
                        key={`${issue}-${index}`}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-700"
                      >
                        {issue}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Không phát hiện vấn đề chất lượng tài liệu cần lưu ý.
                  </p>
                )}
              </div>
            </SectionCard>

            <SectionCard id="full-report" title="Báo cáo tổng hợp" subtitle="Báo cáo nội bộ">
              <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8f6f1)] p-6">
                <div className="mb-5 flex flex-wrap gap-3">
                  <span
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-semibold',
                      getRiskTone(result.overall_risk).accent,
                    )}
                  >
                    {getRiskBadgeText(result.overall_risk)}
                  </span>
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                    {formatConfidence(result.overall_confidence)} độ tin cậy
                  </span>
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap font-serif text-base leading-8 text-slate-900">
                  {fullReport}
                </pre>
              </div>
            </SectionCard>

            <section className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_22px_65px_-34px_rgba(15,23,42,0.28)] backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Tác vụ
                  </p>
                  <h3 className="mt-1 font-serif text-2xl text-slate-950">Quyết định xử lý</h3>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100">
                    <Check className="h-4 w-4" />
                    Đánh dấu hợp đồng hợp lệ
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100">
                    <AlertTriangle className="h-4 w-4" />
                    Yêu cầu kiểm tra thêm
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-800 transition hover:bg-red-100">
                    <XCircle className="h-4 w-4" />
                    Chuyển bộ phận pháp lý
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                    Tải báo cáo JSON
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
