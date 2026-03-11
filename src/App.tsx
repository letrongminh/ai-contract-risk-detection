import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, FileWarning, ChevronDown, ChevronUp, Download, Check, AlertTriangle } from 'lucide-react';
import { AnalysisResult } from './types';
import { analyzeContracts } from './services/geminiService';
import { diffWords } from 'diff';

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const diff = diffWords(oldText, newText);

  return (
    <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
      {diff.map((part, index) => {
        if (part.added) {
          return <span key={index} className="bg-emerald-100 text-emerald-800 px-1 rounded font-semibold">[{part.value}]</span>;
        }
        if (part.removed) {
          return <span key={index} className="bg-red-100 text-red-800 px-1 rounded line-through opacity-70">[{part.value}]</span>;
        }
        return <span key={index} className="text-slate-700">{part.value}</span>;
      })}
    </div>
  );
}

export default function App() {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [submittedFile, setSubmittedFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState('SPA');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedClauses, setExpandedClauses] = useState<Record<number, boolean>>({});

  const toggleClause = (idx: number) => {
    setExpandedClauses(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleAnalyze = async () => {
    if (!templateFile || !submittedFile) {
      setError('Vui lòng tải lên cả hai tệp.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setExpandedClauses({});

    try {
      const analysisResult = await analyzeContracts(templateFile, submittedFile, contractType);
      setResult(analysisResult);
    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Đã xảy ra lỗi không xác định trong quá trình phân tích.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadJson = () => {
    if (!result) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "contract_risk_report.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const getRiskLabel = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'PASS': return 'HỢP LỆ';
      case 'REVIEW': return 'CẦN KIỂM TRA';
      case 'FAIL': return 'NGHIÊM TRỌNG';
      case 'CRITICAL': return 'NGHIÊM TRỌNG';
      case 'LOW': return 'THẤP';
      default: return risk?.toUpperCase() || 'KHÔNG XÁC ĐỊNH';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-semibold tracking-tight">Hệ Thống Kiểm Tra Hợp Đồng AI</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8 mt-4">
        {!result && !isAnalyzing && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-2xl font-semibold mb-6">Bắt Đầu Kiểm Tra</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Loại Hợp Đồng</label>
                <select 
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full max-w-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="SPA">Hợp đồng Mua bán (SPA)</option>
                  <option value="DEPOSIT">Hợp đồng Đặt cọc</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                  <h3 className="font-medium mb-1">Hợp Đồng Mẫu</h3>
                  <p className="text-sm text-slate-500 mb-4">Tải lên bản mẫu chính thức (PDF, JPG, PNG)</p>
                  <input 
                    type="file" 
                    accept=".pdf,image/jpeg,image/png"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {templateFile && <p className="mt-2 text-sm text-emerald-600 font-medium">{templateFile.name}</p>}
                </div>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mb-3" />
                  <h3 className="font-medium mb-1">Hợp Đồng Khách Gửi</h3>
                  <p className="text-sm text-slate-500 mb-4">Tải lên bản khách hàng đã ký (PDF, JPG, PNG)</p>
                  <input 
                    type="file" 
                    accept=".pdf,image/jpeg,image/png"
                    onChange={(e) => setSubmittedFile(e.target.files?.[0] || null)}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {submittedFile && <p className="mt-2 text-sm text-emerald-600 font-medium">{submittedFile.name}</p>}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!templateFile || !submittedFile}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Phân Tích Hợp Đồng
                </button>
              </div>
            </div>
          </section>
        )}

        {isAnalyzing && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Đang phân tích hợp đồng...</h2>
              <p className="text-slate-500">Trích xuất cấu trúc, so sánh điều khoản và phân loại rủi ro.</p>
              <p className="text-sm text-slate-400 mt-2">Quá trình này có thể mất đến 2 phút.</p>
            </div>
          </div>
        )}

        {result && !isAnalyzing && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold uppercase tracking-tight">Kết Quả Kiểm Tra Hợp Đồng</h2>
              <button 
                onClick={() => setResult(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Kiểm tra mới
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className={`p-6 border-b ${
                result.overall_risk === 'PASS' ? 'bg-emerald-50 border-emerald-100' :
                result.overall_risk === 'REVIEW' ? 'bg-amber-50 border-amber-100' :
                'bg-red-50 border-red-100'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Mức độ rủi ro</span>
                    <div className="flex items-center gap-2">
                      {result.overall_risk === 'PASS' && <CheckCircle className="w-6 h-6 text-emerald-600" />}
                      {result.overall_risk === 'REVIEW' && <FileWarning className="w-6 h-6 text-amber-600" />}
                      {result.overall_risk === 'FAIL' && <XCircle className="w-6 h-6 text-red-600" />}
                      <span className={`text-2xl font-bold ${
                        result.overall_risk === 'PASS' ? 'text-emerald-700' :
                        result.overall_risk === 'REVIEW' ? 'text-amber-700' :
                        'text-red-700'
                      }`}>
                        {getRiskLabel(result.overall_risk)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Độ tin cậy phân tích</span>
                    <span className="text-2xl font-bold text-slate-700">{Math.round(result.overall_confidence * 100)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Khuyến nghị xử lý</span>
                    <span className="text-base font-medium text-slate-900 leading-tight">{result.recommended_action}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-white">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Tóm tắt phát hiện</h3>
                <p className="text-slate-800 text-lg leading-relaxed whitespace-pre-wrap">{result.summary}</p>
              </div>
            </div>

            {/* Issue Counts Summary */}
            <div className="flex gap-4">
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="bg-red-100 text-red-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {result.clause_differences.filter(d => d.risk?.toUpperCase() === 'CRITICAL' || d.risk?.toUpperCase() === 'FAIL').length + result.field_differences.filter(d => d.risk?.toUpperCase() === 'CRITICAL' || d.risk?.toUpperCase() === 'FAIL').length}
                </div>
                <span className="text-red-800 font-medium">Sai lệch nghiêm trọng</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="bg-amber-100 text-amber-700 rounded-full w-8 h-8 flex items-center justify-center font-bold">
                  {result.clause_differences.filter(d => d.risk?.toUpperCase() === 'REVIEW').length + result.field_differences.filter(d => d.risk?.toUpperCase() === 'REVIEW').length}
                </div>
                <span className="text-amber-800 font-medium">Sai lệch cần kiểm tra</span>
              </div>
            </div>

            {/* Clause Differences */}
            {result.clause_differences.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-slate-200 pb-2">Sai Lệch Điều Khoản</h3>
                {result.clause_differences.map((diff, idx) => {
                  const isExpanded = expandedClauses[idx] !== false; // Default to expanded
                  const isCritical = diff.risk?.toUpperCase() === 'CRITICAL' || diff.risk?.toUpperCase() === 'FAIL';
                  
                  return (
                    <div key={idx} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isCritical ? 'border-red-200' : 'border-amber-200'}`}>
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${isCritical ? 'bg-red-50/30' : 'bg-amber-50/30'}`}
                        onClick={() => toggleClause(idx)}
                      >
                        <div className="flex items-center gap-3">
                          {isCritical ? <XCircle className="w-5 h-5 text-red-500" /> : <FileWarning className="w-5 h-5 text-amber-500" />}
                          <h4 className="font-semibold text-slate-900 text-lg">{diff.clause_id} – {diff.title}</h4>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {getRiskLabel(diff.risk)}
                          </span>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="p-5 border-t border-slate-100 space-y-6">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Nhận định</span>
                            <p className="text-slate-800 font-medium">{diff.reason}</p>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Hợp đồng mẫu</span>
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600 font-mono whitespace-pre-wrap h-full">
                                {diff.template_excerpt}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Hợp đồng khách gửi (Highlight thay đổi)</span>
                              <div className="bg-white border border-slate-200 rounded-lg p-4 h-full">
                                <DiffViewer oldText={diff.template_excerpt} newText={diff.submitted_excerpt} />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <FileText className="w-4 h-4" />
                            <span>Trang liên quan: {diff.page_refs_submitted.join(', ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Field Differences */}
            {result.field_differences.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-slate-200 pb-2">Sai Lệch Dữ Liệu</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {result.field_differences.map((diff, idx) => {
                    const isCritical = diff.risk?.toUpperCase() === 'CRITICAL' || diff.risk?.toUpperCase() === 'FAIL';
                    return (
                      <div key={idx} className={`bg-white rounded-xl shadow-sm border p-5 ${isCritical ? 'border-red-200' : 'border-amber-200'}`}>
                        <div className="flex items-start justify-between mb-4">
                          <h4 className="font-semibold text-slate-900 text-lg">Trường dữ liệu: {diff.field_name}</h4>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {getRiskLabel(diff.risk)}
                          </span>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Hợp đồng mẫu</span>
                            <p className="text-slate-600 font-mono text-sm">{diff.template_value || 'Không có'}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Hợp đồng khách gửi</span>
                            <p className="text-slate-900 font-mono font-medium text-sm">{diff.submitted_value || 'Không có'}</p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                          <p className="text-sm text-slate-700">{diff.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document Quality */}
            {(result.document_quality.issues.length > 0 || result.document_quality.missing_pages.length > 0) && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold border-b border-slate-200 pb-2">Chất Lượng Tài Liệu</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-1">Khả năng đọc</span>
                      <span className="text-lg font-medium text-slate-900">{result.document_quality.readability || 'Trung bình'}</span>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-1">Trang thiếu</span>
                      <span className={`text-lg font-medium ${result.document_quality.missing_pages.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                        {result.document_quality.missing_pages.length > 0 ? result.document_quality.missing_pages.join(', ') : 'Không phát hiện'}
                      </span>
                    </div>
                    <div className="md:col-span-3">
                      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-2">Vấn đề phát hiện</span>
                      {result.document_quality.issues.length > 0 ? (
                        <ul className="space-y-2">
                          {result.document_quality.issues.map((issue, idx) => (
                            <li key={idx} className="text-slate-700 flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 shrink-0"></span>
                              {issue}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-slate-600">Không có vấn đề nào được ghi nhận.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
              <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-end gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-medium hover:bg-emerald-100 transition-colors">
                  <Check className="w-4 h-4" />
                  Đánh dấu hợp lệ
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-medium hover:bg-amber-100 transition-colors">
                  <AlertTriangle className="w-4 h-4" />
                  Yêu cầu kiểm tra thêm
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-medium hover:bg-red-100 transition-colors">
                  <XCircle className="w-4 h-4" />
                  Chuyển bộ phận pháp lý
                </button>
                <div className="w-px h-8 bg-slate-200 mx-2"></div>
                <button 
                  onClick={handleDownloadJson}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải báo cáo JSON
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
