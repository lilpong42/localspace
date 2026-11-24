'use client';

import {
  AlertTriangle,
  CheckSquare,
  ClipboardList,
  Printer,
  RefreshCw,
  ShieldCheck,
  Square,
} from 'lucide-react';
import type { AiAnalyzeResponse } from '@/lib/types';

export interface ChecklistItemProgress {
  checked: boolean;
  answerMemo: string;
}

export type ChecklistProgressMap = Record<string, ChecklistItemProgress>;

interface AiVerificationPanelProps {
  response: AiAnalyzeResponse | null;
  loading: boolean;
  error: string | null;
  checklistProgress: ChecklistProgressMap;
  onToggleCheck: (itemKey: string) => void;
  onChangeAnswerMemo: (itemKey: string, memo: string) => void;
  onReanalyze: () => void;
  onPrintReport: () => void;
}

export function getChecklistItemKey(index: number, question: string): string {
  return `${index}:${question.slice(0, 24)}`;
}

export function AiVerificationPanel({
  response,
  loading,
  error,
  checklistProgress,
  onToggleCheck,
  onChangeAnswerMemo,
  onReanalyze,
  onPrintReport,
}: AiVerificationPanelProps) {
  const analysis = response?.analysis ?? null;
  const checklist = analysis?.landlord_checklist ?? [];
  const completedCount = checklist.filter(
    (item, idx) => checklistProgress[getChecklistItemKey(idx, item.question)]?.checked
  ).length;
  const progressPct =
    checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6"
      aria-label="근거 기반 AI 비교·검증 및 임대인 확인 체크리스트"
    >
      {/* STEP 3 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#0B0F17] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
              STEP 3
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              AI 핵심 요약 & 현장 재방문 체크리스트
            </h2>
            {response && (
              <span
                id="ai-engine-mode-badge"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                  response.mode === 'LIVE GEMINI AI'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    response.mode === 'LIVE GEMINI AI'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
                {response.mode}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            입력한 조건·현장 메모·공공통계만 근거로 핵심 차이와 임대인에게 꼭 물어볼 질문을 정리했습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-reanalyze-ai"
            type="button"
            disabled={loading}
            onClick={onReanalyze}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '분석 중...' : 'AI 다시 분석'}
          </button>

          <button
            id="btn-print-report"
            type="button"
            onClick={onPrintReport}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0B0F17] px-4 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            A4 상담 리포트 인쇄 / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading && !analysis ? (
        <div className="mt-5 space-y-4 animate-pulse">
          <div className="h-24 rounded-xl bg-slate-100" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-32 rounded-xl bg-slate-100" />
            <div className="h-32 rounded-xl bg-slate-100" />
          </div>
          <div className="h-44 rounded-xl bg-slate-100" />
        </div>
      ) : analysis ? (
        <div className="mt-5 space-y-6">
          {/* 1. 핵심 차이 3줄 요약 */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
            <h3 className="text-sm font-bold text-slate-900">
              핵심 차이 3줄 요약
            </h3>
            <ul className="mt-3 space-y-3">
              {analysis.tradeoff_summary.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm leading-relaxed text-slate-800"
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B0F17] text-xs font-bold text-amber-300">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. 후보별 꼭 확인할 리스크 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-200/70 bg-blue-50/35 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                후보 A · 꼭 확인할 리스크
              </div>
              <ul className="mt-3 space-y-2.5">
                {analysis.candidate_a_risks.map((risk, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-700"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/35 p-5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
                <AlertTriangle className="h-4 w-4 text-emerald-600" />
                후보 B · 꼭 확인할 리스크
              </div>
              <ul className="mt-3 space-y-2.5">
                {analysis.candidate_b_risks.map((risk, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-700"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3. 현장 재방문 임대인·중개사 확인 체크리스트 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-slate-800" />
                <h3 className="text-sm font-bold text-slate-900 sm:text-base">
                  임대인·중개사에게 꼭 물어볼 질문 체크리스트
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold tabular-nums text-slate-700">
                  {completedCount} / {checklist.length} 완료
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              현장에서 확인한 항목을 체크하고 답변을 적어두세요. 브라우저에 자동 저장되며 A4 리포트에도 함께 인쇄됩니다.
            </p>

            <div className="mt-4 space-y-3">
              {checklist.map((item, idx) => {
                const key = getChecklistItemKey(idx, item.question);
                const state = checklistProgress[key] ?? {
                  checked: false,
                  answerMemo: '',
                };

                const targetBadgeCls =
                  item.target === '후보 A'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : item.target === '후보 B'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-4 transition ${
                      state.checked
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleCheck(key)}
                        aria-label={`질문 ${idx + 1} 확인 완료 토글`}
                        className="mt-0.5 shrink-0 text-slate-500 transition hover:text-slate-900"
                      >
                        {state.checked ? (
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${targetBadgeCls}`}
                          >
                            {item.target}
                          </span>
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {item.category}
                          </span>
                        </div>

                        <p
                          className={`text-sm font-bold leading-snug ${
                            state.checked
                              ? 'text-slate-400 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.question}
                        </p>

                        <p className="text-xs leading-relaxed text-slate-500">
                          <span className="font-semibold text-slate-600">확인 이유:</span>{' '}
                          {item.reason}
                        </p>

                        <input
                          type="text"
                          value={state.answerMemo}
                          onChange={(e) => onChangeAnswerMemo(key, e.target.value)}
                          placeholder="현장 답변 메모 (예: 임대인 1개월 렌트프리 협의 가능)"
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. 가드레일 고지 */}
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{analysis.guardrail_notice}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
