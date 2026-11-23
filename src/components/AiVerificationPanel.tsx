'use client';

import {
  AlertTriangle,
  Bot,
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

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
      aria-label="근거 기반 AI 비교·검증 패널 및 임대인 확인 체크리스트"
    >
      {/* 헤더 + 실행 상태 배지 (LIVE GEMINI AI / SAFE FALLBACK) */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Bot className="h-4.5 w-4.5 text-slate-800" />
            <h2 className="text-base font-bold text-slate-900">
              근거 기반 AI 비교·검증 & 현장 확인 체크리스트
            </h2>

            {response && (
              <span
                id="ai-engine-mode-badge"
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight ${
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
          <p className="mt-1 text-xs text-slate-500">
            입력된 매물 조건, 정량 판정 결과, 공공 상권·거주인구 통계, 현장 방문 메모에만 근거해 트레이드오프와 임대인 확인 질문을 정리합니다.
            {response?.fallbackReason && (
              <span className="ml-1.5 text-slate-400">
                ({response.fallbackReason})
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-reanalyze-ai"
            type="button"
            disabled={loading}
            onClick={onReanalyze}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? '근거 분석 중...' : '현재 입력으로 AI 재분석'}
          </button>

          <button
            id="btn-print-report"
            type="button"
            onClick={onPrintReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            상담용 A4 리포트 인쇄 / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-800">
          {error}
        </div>
      )}

      {loading && !analysis ? (
        <div className="mt-5 space-y-3 animate-pulse">
          <div className="h-20 rounded-lg bg-slate-100" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="h-28 rounded-lg bg-slate-100" />
            <div className="h-28 rounded-lg bg-slate-100" />
          </div>
          <div className="h-40 rounded-lg bg-slate-100" />
        </div>
      ) : analysis ? (
        <div className="mt-4 space-y-5">
          {/* 1. 핵심 트레이드오프 요약 */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
              1. 후보 A vs 후보 B 핵심 트레이드오프 요약
            </h3>
            <ul className="mt-2.5 space-y-2">
              {analysis.tradeoff_summary.map((line, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-800"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. 후보별 확인 필요 리스크 */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            <div className="rounded-xl border border-blue-200/70 bg-blue-50/30 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <AlertTriangle className="h-3.5 w-3.5 text-blue-600" />
                2-A. 후보 A 확인 필요 리스크
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {analysis.candidate_a_risks.map((risk, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <AlertTriangle className="h-3.5 w-3.5 text-emerald-600" />
                2-B. 후보 B 확인 필요 리스크
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {analysis.candidate_b_risks.map((risk, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 3. 인터랙티브 임장·임대인 확인 체크리스트 (localStorage 자동 저장) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900">
                  3. 현장 재방문 시 임대인·중개사 확인 체크리스트
                </h3>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700">
                  {completedCount} / {checklist.length} 확인 완료
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                체크 상태 및 현장 답변 메모는 브라우저(localStorage)에 자동 저장됩니다
              </span>
            </div>

            <div className="space-y-2.5">
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
                    className={`rounded-lg border p-3 transition ${
                      state.checked
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleCheck(key)}
                        aria-label={`질문 ${idx + 1} 확인 완료 토글`}
                        className="mt-0.5 shrink-0 text-slate-600 transition hover:text-slate-900"
                      >
                        {state.checked ? (
                          <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                        ) : (
                          <Square className="h-4.5 w-4.5 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${targetBadgeCls}`}
                          >
                            {item.target}
                          </span>
                          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                            {item.category}
                          </span>
                        </div>

                        <p
                          className={`text-xs font-semibold leading-snug ${
                            state.checked
                              ? 'text-slate-500 line-through'
                              : 'text-slate-900'
                          }`}
                        >
                          {item.question}
                        </p>

                        <p className="text-[11px] leading-relaxed text-slate-500">
                          <span className="font-medium text-slate-600">근거:</span>{' '}
                          {item.reason}
                        </p>

                        <input
                          type="text"
                          value={state.answerMemo}
                          onChange={(e) => onChangeAnswerMemo(key, e.target.value)}
                          placeholder="현장 답변 메모 기록 (예: 임대인 1개월 렌트프리 구두 동의, 배수관 확인 완료)"
                          className="mt-1 h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. 가드레일 고지 */}
          <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-slate-600">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <span>{analysis.guardrail_notice}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
