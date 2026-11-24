'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  HelpCircle,
  ListFilter,
  MapPin,
  Pencil,
  SlidersHorizontal,
  Sparkles,
  Store,
  Users,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import type { MapFocusRequest } from '@/components/ComparisonMap';
import { formatSigned } from '@/lib/compareEngine';
import { PRESET_SCENARIOS } from '@/lib/presets';
import type { MatchedCatalogItem } from '@/lib/propertyCatalog';
import {
  BUSINESS_CATEGORIES,
  type AiAnalyzeResponse,
  type BusinessCategory,
  type CandidateEvaluation,
  type CandidateProperty,
  type ComparisonSummary,
  type DataSourceMeta,
  type StatusLevel,
  type UserCriteria,
} from '@/lib/types';

interface WorkspaceViewProps {
  activePresetId: string | null;
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  rankedCatalog: MatchedCatalogItem[];
  aiResponse: AiAnalyzeResponse | null;
  aiLoading: boolean;
  meta: DataSourceMeta;
  mapSlot: React.ReactNode;
  onSelectPreset: (presetId: string) => void;
  onChangeCriteria: (next: UserCriteria) => void;
  onAutoMatchByCriteria: () => void;
  onApplyCatalogToSlot: (slot: 'A' | 'B', item: MatchedCatalogItem) => void;
  onSwapCandidates: () => void;
  onEditCandidate: (slot: 'A' | 'B') => void;
  onFocusMap: (slot: MapFocusRequest['slot']) => void;
  onOpenAiTab: () => void;
}

function kpiPillCls(status: StatusLevel | undefined): string {
  if (status === 'fail') return 'border-rose-200 bg-rose-50/70 text-rose-800';
  if (status === 'warn') return 'border-amber-200 bg-amber-50/70 text-amber-800';
  return 'border-emerald-200/80 bg-emerald-50/50 text-emerald-800';
}

function StatusIcon({ status }: { status: StatusLevel }) {
  if (status === 'pass') return <CheckCircle2 className="h-3 w-3 text-emerald-600" />;
  if (status === 'warn') return <AlertTriangle className="h-3 w-3 text-amber-600" />;
  return <AlertCircle className="h-3 w-3 text-rose-600" />;
}

interface CompactCandidateCardProps {
  criteria: UserCriteria;
  candidate: CandidateProperty;
  evaluation: CandidateEvaluation;
  onFocus: () => void;
  onEdit: () => void;
}

function CompactCandidateCard({
  criteria,
  candidate,
  evaluation,
  onFocus,
  onEdit,
}: CompactCandidateCardProps) {
  const isA = candidate.slot === 'A';
  const rentCheck = evaluation.checks.find((c) => c.key === 'monthlyRent');
  const areaCheck = evaluation.checks.find((c) => c.key === 'area');
  const depositCheck = evaluation.checks.find((c) => c.key === 'deposit');
  const rentDelta = candidate.monthlyRent - criteria.maxMonthlyRent;
  const areaDelta = Math.round((candidate.areaPyeong - criteria.minAreaPyeong) * 10) / 10;

  return (
    <article
      onClick={onFocus}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onFocus();
        }
      }}
      className={`group flex flex-col rounded-2xl border bg-white p-3.5 text-left shadow-2xs transition hover:shadow-md cursor-pointer ${
        isA
          ? 'border-blue-200/90 hover:border-blue-400'
          : 'border-emerald-200/90 hover:border-emerald-400'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-extrabold text-white ${
                isA ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              {candidate.slot}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold ${
                candidate.industry === criteria.targetIndustry
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {candidate.industry}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600">
              {candidate.floor}
            </span>
          </div>
          <h3 className="mt-1.5 truncate text-sm font-extrabold text-slate-900 group-hover:text-blue-700">
            {candidate.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{candidate.address}</span>
          </p>
        </div>

        <button
          id={`btn-edit-candidate-${candidate.slot}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-900 hover:text-white"
        >
          <Pencil className="h-3 w-3" />
          수정
        </button>
      </div>

      {/* 핵심 3지표 (기준 충족 색상 즉각 표시) */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className={`rounded-xl border px-2 py-2 ${kpiPillCls(rentCheck?.status)}`}>
          <div className="text-[10px] font-medium opacity-80">매달 고정비</div>
          <div className="mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">
            {evaluation.monthlyFixedCost.toLocaleString()}만
          </div>
          <div className="truncate text-[10px] font-bold tabular-nums">
            {rentDelta > 0 ? `+${rentDelta}만 초과` : `${Math.abs(rentDelta)}만 여유`}
          </div>
        </div>

        <div className={`rounded-xl border px-2 py-2 ${kpiPillCls(areaCheck?.status)}`}>
          <div className="text-[10px] font-medium opacity-80">가게 크기</div>
          <div className="mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">
            {candidate.areaPyeong}평
          </div>
          <div className="truncate text-[10px] font-bold tabular-nums">
            {areaDelta < 0 ? `${Math.abs(areaDelta)}평 부족` : `+${areaDelta}평 여유`}
          </div>
        </div>

        <div className={`rounded-xl border px-2 py-2 ${kpiPillCls(depositCheck?.status)}`}>
          <div className="text-[10px] font-medium opacity-80">처음 돈</div>
          <div className="mt-0.5 text-sm font-extrabold tabular-nums text-slate-900">
            {evaluation.initialOutlayTotal.toLocaleString()}만
          </div>
          <div className="truncate text-[10px] font-semibold tabular-nums">
            보증 {candidate.deposit.toLocaleString()}만
          </div>
        </div>
      </div>

      {/* 항목별 충족 칩 */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        {evaluation.checks.slice(0, 5).map((c) => (
          <span
            key={c.key}
            className="inline-flex items-center gap-0.5 rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700"
            title={c.detail}
          >
            <StatusIcon status={c.status} />
            {c.label.replace(/\s*\(.+\)/, '').replace('최소 ', '')}
          </span>
        ))}
      </div>

      {/* 상권 & 거주인구 2줄 */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
          <Store className="h-3 w-3 text-slate-400" />
          동종 {evaluation.commercial.sameIndustryCount}곳 ({evaluation.commercial.sameIndustryDensityPct}%)
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Users className="h-3 w-3 text-slate-400" />
          {evaluation.population
            ? `${evaluation.population.adminDong} ${evaluation.population.totalPopulation.toLocaleString()}명`
            : '인구 없음'}
        </span>
      </div>

      {/* 임장 메모 1줄 요약 */}
      {candidate.fieldNotes && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#FFFBEB] px-2.5 py-1.5 text-[11px] text-[#78350F]">
          <FileText className="mt-0.5 h-3 w-3 shrink-0 text-[#B45309]" />
          <span className="line-clamp-2 leading-snug">{candidate.fieldNotes}</span>
        </div>
      )}
    </article>
  );
}

export function WorkspaceView({
  activePresetId,
  criteria,
  candidateA,
  candidateB,
  comparison,
  rankedCatalog,
  aiResponse,
  aiLoading,
  meta,
  mapSlot,
  onSelectPreset,
  onChangeCriteria,
  onAutoMatchByCriteria,
  onApplyCatalogToSlot,
  onSwapCandidates,
  onEditCandidate,
  onFocusMap,
  onOpenAiTab,
}: WorkspaceViewProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showQuickGuide, setShowQuickGuide] = useState(false);

  const { evalA, evalB, diffs, industryMismatch, industryMismatchMessage } =
    comparison;
  const sameIndustryCount = rankedCatalog.filter((r) => r.sameIndustry).length;
  const checklistCount = aiResponse?.analysis.landlord_checklist.length ?? 0;

  return (
    <div className="flex flex-1 flex-col-reverse lg:h-[calc(100vh-57px)] lg:flex-row lg:overflow-hidden">
      {/* 좌측 앱 워크벤치 (독립 스크롤) */}
      <aside className="flex w-full flex-col bg-[#F8FAFC] lg:w-[540px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-slate-200 xl:w-[590px]">
        <div className="space-y-3.5 p-4 pb-24 lg:pb-6">
          {/* 1. 앱 정체성 1줄 리본 + 초간단 사용법 토글 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 sm:text-[13px]">
                  창업할 가게 자리 2곳(A vs B)을 지도·비용·상권으로 비교합니다
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  카드를 누르면 지도가 이동하고, 지도의 <strong>[A 찍기 / B 찍기]</strong>로 원하는 골목을 직접 찍을 수 있어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickGuide((v) => !v)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
              >
                <HelpCircle className="h-3.5 w-3.5 text-[#92400E]" />
                사용법
              </button>
            </div>

            {showQuickGuide && (
              <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5 text-[11px]">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="font-extrabold text-[#92400E]">1. 조건 / 위치</div>
                  <div className="mt-0.5 text-slate-600">
                    업종·예산을 고르거나 지도 검색·핀 찍기
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="font-extrabold text-[#92400E]">2. A vs B 대조</div>
                  <div className="mt-0.5 text-slate-600">
                    초록(충족)·빨강(초과)과 주변 가게 비교
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="font-extrabold text-[#92400E]">3. AI · 리포트</div>
                  <div className="mt-0.5 text-slate-600">
                    집주인 질문 체크 후 A4 상담 PDF 출력
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. 원클릭 시연 프리셋 + 내 조건 퀵 필터 바 */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs space-y-3">
            {/* 프리셋 3종 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 mr-0.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                시연:
              </span>
              {PRESET_SCENARIOS.map((preset) => {
                const isActive = preset.id === activePresetId;
                return (
                  <button
                    key={preset.id}
                    id={`preset-btn-${preset.id}`}
                    type="button"
                    onClick={() => onSelectPreset(preset.id)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                      isActive
                        ? 'border-[#0B0F17] bg-[#0B0F17] text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset.title}
                  </button>
                );
              })}
            </div>

            {/* 내 조건 요약 칩 + 액션 버튼 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <select
                  id="criteria-industry"
                  aria-label="희망 업종 선택"
                  value={criteria.targetIndustry}
                  onChange={(e) =>
                    onChangeCriteria({
                      ...criteria,
                      targetIndustry: e.target.value as BusinessCategory,
                    })
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <button
                  id="btn-toggle-filters"
                  type="button"
                  onClick={() => setShowFilters((v) => !v)}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition ${
                    showFilters
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  월세≤{criteria.maxMonthlyRent}만 · {criteria.minAreaPyeong}평↑
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  id="btn-auto-match-criteria"
                  type="button"
                  onClick={onAutoMatchByCriteria}
                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0B0F17] px-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
                  title="현재 설정한 업종·예산·면적에 맞는 후보 2곳 자동 매칭"
                >
                  <Wand2 className="h-3.5 w-3.5 text-amber-300" />
                  자동매칭 ({sameIndustryCount})
                </button>

                <button
                  id="btn-toggle-catalog"
                  type="button"
                  onClick={() => setShowCatalog((v) => !v)}
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition ${
                    showCatalog
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  매물 ({rankedCatalog.length})
                </button>
              </div>
            </div>

            {/* 상세 기준 슬라이더/인풋 (필요할 때만 펼침) */}
            {showFilters && (
              <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-slate-50 p-3 sm:grid-cols-4 border border-slate-200/70">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">최대 보증금</span>
                  <input
                    id="criteria-max-deposit"
                    type="number"
                    min={0}
                    step={100}
                    value={criteria.maxDeposit}
                    onChange={(e) =>
                      onChangeCriteria({
                        ...criteria,
                        maxDeposit: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold tabular-nums text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">최대 월세</span>
                  <input
                    id="criteria-max-rent"
                    type="number"
                    min={0}
                    step={10}
                    value={criteria.maxMonthlyRent}
                    onChange={(e) =>
                      onChangeCriteria({
                        ...criteria,
                        maxMonthlyRent: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold tabular-nums text-slate-900"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">최소 면적(평)</span>
                  <input
                    id="criteria-min-area"
                    type="number"
                    min={1}
                    step={0.5}
                    value={criteria.minAreaPyeong}
                    onChange={(e) =>
                      onChangeCriteria({
                        ...criteria,
                        minAreaPyeong: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold tabular-nums text-slate-900"
                  />
                </label>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-slate-500">1층 조건</span>
                  <button
                    id="criteria-first-floor"
                    type="button"
                    onClick={() =>
                      onChangeCriteria({
                        ...criteria,
                        requireFirstFloor: !criteria.requireFirstFloor,
                      })
                    }
                    className={`h-9 rounded-lg border text-xs font-bold transition ${
                      criteria.requireFirstFloor
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {criteria.requireFirstFloor ? '1층 필수' : '층수 무관'}
                  </button>
                </div>
              </div>
            )}

            {/* 조건별 추천 매물 카탈로그 선택기 */}
            {showCatalog && (
              <div className="max-h-60 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                {rankedCatalog.map((item) => {
                  const { listing } = item;
                  return (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                            {listing.industry}
                          </span>
                          <span className="truncate text-xs font-bold text-slate-900">
                            {listing.name}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">
                          매달 {item.monthlyFixedCost}만 · {listing.areaPyeong}평 · 충족 {item.passCount}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyCatalogToSlot('A', item);
                            onFocusMap('A');
                          }}
                          className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-600 hover:text-white"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApplyCatalogToSlot('B', item);
                            onFocusMap('B');
                          }}
                          className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white"
                        >
                          B
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. 업종 상이 경고 배너 (필수 가드레일 배지 3) */}
          {industryMismatch && industryMismatchMessage && (
            <div
              id="industry-mismatch-banner"
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-600" />
              <div>
                <div className="text-xs font-extrabold sm:text-[13px]">
                  {industryMismatchMessage}
                </div>
                <p className="mt-0.5 text-[11px] text-amber-900">
                  후보 A({candidateA.industry}) vs 후보 B({candidateB.industry}) — 단순 점포 수 대신 설비·인허가 중심으로 따로 보세요.
                </p>
              </div>
            </div>
          )}

          {/* 4. 후보 A vs 후보 B 인터랙티브 비교 카드 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-slate-800">
                후보 A vs 후보 B (카드 클릭 → 지도 이동)
              </span>
              <button
                type="button"
                onClick={onSwapCandidates}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <ArrowLeftRight className="h-3 w-3" />
                A ↔ B 맞바꾸기
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <CompactCandidateCard
                criteria={criteria}
                candidate={candidateA}
                evaluation={evalA}
                onFocus={() => onFocusMap('A')}
                onEdit={() => onEditCandidate('A')}
              />
              <CompactCandidateCard
                criteria={criteria}
                candidate={candidateB}
                evaluation={evalB}
                onFocus={() => onFocusMap('B')}
                onEdit={() => onEditCandidate('B')}
              />
            </div>
          </div>

          {/* 5. 핵심 격차 1눈 요약 스트립 (B - A) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">
                한눈에 보는 A 대비 B 차이 (억지 순위 없음)
              </span>
              <span className="text-[10.5px] text-slate-400">
                기준 {meta.commercialReferenceDate}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <div className="text-[10.5px] text-slate-500">월 고정비</div>
                <div className="mt-0.5 font-extrabold tabular-nums text-slate-900">
                  {formatSigned(diffs.fixedCostDiff, '만원')}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <div className="text-[10.5px] text-slate-500">평당 고정비</div>
                <div className="mt-0.5 font-extrabold tabular-nums text-slate-900">
                  {formatSigned(diffs.costPerPyeongDiff, '만/평')}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <div className="text-[10.5px] text-slate-500">가게 크기</div>
                <div className="mt-0.5 font-extrabold tabular-nums text-slate-900">
                  {formatSigned(diffs.areaPyeongDiff, '평')}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                <div className="text-[10.5px] text-slate-500">동종 밀집도</div>
                <div className="mt-0.5 font-extrabold tabular-nums text-slate-900">
                  {industryMismatch
                    ? '비교 보류'
                    : formatSigned(diffs.densityPctDiff, '%p')}
                </div>
              </div>
            </div>
          </div>

          {/* 6. 실시간 AI 결론 미리보기 & 임장노트 바로가기 카드 */}
          <div className="rounded-2xl border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] to-white p-4 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#92400E]">
                <Bot className="h-4 w-4" />
                AI 근거 요약 · 임대인 질문 {checklistCount}개 준비됨
              </div>
              {aiResponse && (
                <span className="rounded-full border border-amber-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  {aiResponse.mode}
                </span>
              )}
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-700">
              {aiLoading && !aiResponse
                ? '입력된 조건과 상권 데이터를 바탕으로 핵심 차이를 정리하는 중...'
                : aiResponse?.analysis.tradeoff_summary[0] ||
                  'AI 비교 요약을 불러오는 중입니다.'}
            </p>

            <button
              id="btn-jump-ai-tab"
              type="button"
              onClick={onOpenAiTab}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0B0F17] py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              AI 상세 분석 & 집주인 질문 체크리스트 열기
              <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
            </button>
          </div>
        </div>
      </aside>

      {/* 우측 풀하이트 실시간 인터랙티브 지도 */}
      <div className="h-[460px] w-full shrink-0 lg:h-full lg:flex-1">
        {mapSlot}
      </div>
    </div>
  );
}
