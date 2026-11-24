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
  focusedSlot: 'A' | 'B' | null;
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

function dotColor(status: StatusLevel): string {
  if (status === 'pass') return 'bg-emerald-500';
  if (status === 'warn') return 'bg-amber-400';
  return 'bg-rose-500';
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
  isFocused: boolean;
  onFocus: () => void;
  onEdit: () => void;
}

function CompactCandidateCard({
  criteria,
  candidate,
  evaluation,
  isFocused,
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
      className={`hannyang-card group flex flex-col rounded-[18px] p-4 text-left transition-all cursor-pointer ${
        isFocused
          ? isA
            ? 'ring-2 ring-blue-500 border-blue-400'
            : 'ring-2 ring-emerald-500 border-emerald-400'
          : isA
            ? 'hover:border-blue-300'
            : 'hover:border-emerald-300'
      }`}
    >
      {/* 헤더 + 6점 충족 도트 미터 */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-extrabold text-white shadow-2xs ${
                isA ? 'bg-blue-600' : 'bg-emerald-600'
              }`}
            >
              {candidate.slot}
            </span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${
                candidate.industry === criteria.targetIndustry
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {candidate.industry}
            </span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-slate-600">
              {candidate.floor}
            </span>
            {/* 6개 항목 충족 도트 */}
            <div
              className="ml-0.5 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 border border-slate-200/70"
              title={`충족 ${evaluation.summaryCounts.pass} · 주의 ${evaluation.summaryCounts.warn} · 초과 ${evaluation.summaryCounts.fail}`}
            >
              {evaluation.checks.map((c) => (
                <span
                  key={c.key}
                  className={`h-1.5 w-1.5 rounded-full ${dotColor(c.status)}`}
                />
              ))}
              <span className="ml-0.5 text-[10px] font-bold tabular-nums text-slate-600">
                {evaluation.summaryCounts.pass}/{evaluation.checks.length}
              </span>
            </div>
          </div>

          <h3 className="mt-1.5 truncate text-[15px] font-extrabold tracking-tight text-slate-900">
            {candidate.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-slate-500">
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
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-slate-900 hover:bg-[#0B0F17] hover:text-white"
        >
          <Pencil className="h-3 w-3" />
          수정
        </button>
      </div>

      {/* 핵심 3지표 */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className={`rounded-xl border px-2.5 py-2 ${kpiPillCls(rentCheck?.status)}`}>
          <div className="text-[10px] font-semibold opacity-75">매달 고정비</div>
          <div className="mt-0.5 font-mono text-[15px] font-extrabold tabular-nums text-slate-900">
            {evaluation.monthlyFixedCost.toLocaleString()}
            <span className="ml-0.5 font-sans text-[11px] font-semibold text-slate-500">만</span>
          </div>
          <div className="truncate text-[10px] font-bold tabular-nums">
            {rentDelta > 0 ? `+${rentDelta}만 초과` : `${Math.abs(rentDelta)}만 여유`}
          </div>
        </div>

        <div className={`rounded-xl border px-2.5 py-2 ${kpiPillCls(areaCheck?.status)}`}>
          <div className="text-[10px] font-semibold opacity-75">가게 크기</div>
          <div className="mt-0.5 font-mono text-[15px] font-extrabold tabular-nums text-slate-900">
            {candidate.areaPyeong}
            <span className="ml-0.5 font-sans text-[11px] font-semibold text-slate-500">평</span>
          </div>
          <div className="truncate text-[10px] font-bold tabular-nums">
            {areaDelta < 0 ? `${Math.abs(areaDelta)}평 부족` : `+${areaDelta}평 여유`}
          </div>
        </div>

        <div className={`rounded-xl border px-2.5 py-2 ${kpiPillCls(depositCheck?.status)}`}>
          <div className="text-[10px] font-semibold opacity-75">처음 들어가는 돈</div>
          <div className="mt-0.5 font-mono text-[15px] font-extrabold tabular-nums text-slate-900">
            {evaluation.initialOutlayTotal.toLocaleString()}
            <span className="ml-0.5 font-sans text-[11px] font-semibold text-slate-500">만</span>
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

      {/* 상권 & 거주인구 */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2 text-[11.5px] text-slate-600">
        <span className="inline-flex items-center gap-1 font-bold tabular-nums text-slate-800">
          <Store className="h-3.5 w-3.5 text-slate-400" />
          동종 {evaluation.commercial.sameIndustryCount}곳 ({evaluation.commercial.sameIndustryDensityPct}%)
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums text-slate-500">
          <Users className="h-3.5 w-3.5 text-slate-400" />
          {evaluation.population
            ? `${evaluation.population.adminDong} ${evaluation.population.totalPopulation.toLocaleString()}명`
            : '인구 없음'}
        </span>
      </div>

      {/* 임장 메모 1줄 */}
      {candidate.fieldNotes && (
        <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#FFFBEB] px-2.5 py-1.5 text-[11px] text-[#78350F] border border-[#FDE68A]/70">
          <FileText className="mt-0.5 h-3 w-3 shrink-0 text-[#B45309]" />
          <span className="line-clamp-2 leading-snug">{candidate.fieldNotes}</span>
        </div>
      )}
    </article>
  );
}

interface MirrorGaugeRowProps {
  label: string;
  valA: number;
  valB: number;
  textA: string;
  textB: string;
  diffText: string;
  note?: string;
}

function MirrorGaugeRow({
  label,
  valA,
  valB,
  textA,
  textB,
  diffText,
  note,
}: MirrorGaugeRowProps) {
  const maxVal = Math.max(valA, valB, 1);
  const pctA = Math.max(8, Math.round((valA / maxVal) * 100));
  const pctB = Math.max(8, Math.round((valB / maxVal) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-slate-700">
          {label}
          {note && <span className="ml-1 font-normal text-slate-400">({note})</span>}
        </span>
        <span className="font-mono text-[11px] font-bold tabular-nums text-slate-900">
          {diffText}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 items-center">
        {/* A 바 (오른쪽 정렬) */}
        <div className="flex items-center gap-2">
          <span className="w-16 shrink-0 font-mono text-[11px] font-bold tabular-nums text-blue-700">
            {textA}
          </span>
          <div className="flex h-2 flex-1 justify-end overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${pctA}%` }}
            />
          </div>
        </div>
        {/* B 바 (왼쪽 정렬) */}
        <div className="flex items-center gap-2">
          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-300"
              style={{ width: `${pctB}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right font-mono text-[11px] font-bold tabular-nums text-emerald-700">
            {textB}
          </span>
        </div>
      </div>
    </div>
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
  focusedSlot,
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
      {/* 좌측 앱 워크벤치 (커스텀 슬림 스크롤) */}
      <aside className="app-scroll flex w-full flex-col bg-[#F2F4F8] lg:w-[530px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-slate-200/90 xl:w-[580px]">
        <div className="space-y-3.5 p-4 pb-24 lg:pb-6">
          {/* 1. 1줄 앱 안내 + 사용법 토글 */}
          <div className="hannyang-card rounded-[16px] px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-slate-900">
                  창업할 가게 자리 2곳(A·B)을 지도와 조건으로 나란히 비교하세요
                </div>
                <p className="mt-0.5 text-[11.5px] text-slate-500">
                  카드 클릭 시 지도가 이동하며, 지도의 <strong>[A 찍기/B 찍기]</strong>·주변 매물 핀으로도 바로 비교됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickGuide((v) => !v)}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1.5 text-[11px] font-bold text-[#92400E] transition hover:bg-amber-100"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                30초 가이드
              </button>
            </div>

            {showQuickGuide && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-[11px]">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="font-extrabold text-[#92400E]">01 조건·위치</div>
                  <div className="mt-0.5 text-slate-600">
                    슬라이더로 내 기준 설정 또는 지도 검색·핀 찍기
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="font-extrabold text-[#92400E]">02 A vs B 대조</div>
                  <div className="mt-0.5 text-slate-600">
                    충족 도트·비교 게이지·반경 상권 즉시 대조
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <div className="font-extrabold text-[#92400E]">03 AI·임장노트</div>
                  <div className="mt-0.5 text-slate-600">
                    임대인 질문 체크 후 비교함 저장·PDF 인쇄
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. 원클릭 시연 프리셋 + 슬라이더 조건 필터 */}
          <div className="hannyang-card rounded-[18px] p-3.5 space-y-3">
            {/* 프리셋 3종 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
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
                        ? 'border-[#0B0F17] bg-[#0B0F17] text-white shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset.title}
                  </button>
                );
              })}
            </div>

            {/* 내 조건 퀵 바 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
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
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-extrabold text-slate-900 outline-none focus:border-blue-500"
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
                  className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-bold tabular-nums transition ${
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

            {/* 인터랙티브 슬라이더 필터 패널 */}
            {showFilters && (
              <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3.5">
                {/* 업종 칩 */}
                <div className="flex flex-wrap gap-1.5">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        onChangeCriteria({ ...criteria, targetIndustry: cat })
                      }
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
                        criteria.targetIndustry === cat
                          ? 'bg-[#0B0F17] text-amber-300'
                          : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 3대 슬라이더 + 1층 토글 */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">최대 보증금</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {criteria.maxDeposit.toLocaleString()}만
                      </span>
                    </div>
                    <input
                      id="criteria-max-deposit"
                      type="range"
                      min={500}
                      max={6000}
                      step={100}
                      value={criteria.maxDeposit}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          maxDeposit: Number(e.target.value),
                        })
                      }
                      className="app-slider w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">최대 월세</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {criteria.maxMonthlyRent.toLocaleString()}만
                      </span>
                    </div>
                    <input
                      id="criteria-max-rent"
                      type="range"
                      min={50}
                      max={300}
                      step={5}
                      value={criteria.maxMonthlyRent}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          maxMonthlyRent: Number(e.target.value),
                        })
                      }
                      className="app-slider w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="font-semibold text-slate-500">최소 면적</span>
                      <span className="font-mono font-extrabold text-slate-900">
                        {criteria.minAreaPyeong}평
                      </span>
                    </div>
                    <input
                      id="criteria-min-area"
                      type="range"
                      min={5}
                      max={30}
                      step={0.5}
                      value={criteria.minAreaPyeong}
                      onChange={(e) =>
                        onChangeCriteria({
                          ...criteria,
                          minAreaPyeong: Number(e.target.value),
                        })
                      }
                      className="app-slider w-full"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    id="criteria-first-floor"
                    type="button"
                    onClick={() =>
                      onChangeCriteria({
                        ...criteria,
                        requireFirstFloor: !criteria.requireFirstFloor,
                      })
                    }
                    className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      criteria.requireFirstFloor
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <span>1층 필수 조건</span>
                    <span className="font-extrabold">
                      {criteria.requireFirstFloor ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={onAutoMatchByCriteria}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0B0F17] px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-slate-800"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    이 조건으로 후보 매칭
                  </button>
                </div>
              </div>
            )}

            {/* 조건별 정렬된 매물 탐색 리스트 */}
            {showCatalog && (
              <div className="app-scroll max-h-60 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                {rankedCatalog.map((item) => {
                  const { listing } = item;
                  return (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2"
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
                          매달 {item.monthlyFixedCost}만 · {listing.areaPyeong}평 · 충족 {item.passCount}/6
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onApplyCatalogToSlot('A', item);
                            onFocusMap('A');
                          }}
                          className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-600 hover:text-white"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onApplyCatalogToSlot('B', item);
                            onFocusMap('B');
                          }}
                          className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white"
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
              className="flex items-start gap-2.5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-xs"
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

          {/* 4. 후보 A vs 후보 B 인터랙티브 카드 */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-extrabold text-slate-800">
                후보 A vs 후보 B (카드 클릭 → 지도 이동)
              </span>
              <button
                type="button"
                onClick={onSwapCandidates}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-2xs transition hover:bg-slate-100 hover:text-slate-900"
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
                isFocused={focusedSlot === 'A'}
                onFocus={() => onFocusMap('A')}
                onEdit={() => onEditCandidate('A')}
              />
              <CompactCandidateCard
                criteria={criteria}
                candidate={candidateB}
                evaluation={evalB}
                isFocused={focusedSlot === 'B'}
                onFocus={() => onFocusMap('B')}
                onEdit={() => onEditCandidate('B')}
              />
            </div>
          </div>

          {/* 5. 좌우 대칭 시각 비교 게이지 (A vs B 한눈에 대조) */}
          <div className="hannyang-card rounded-[18px] p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">
                항목별 A vs B 시각 대조 (억지 총점·순위 없음)
              </span>
              <span className="text-[10.5px] text-slate-400">
                {meta.commercialReferenceDate}
              </span>
            </div>

            <div className="space-y-3">
              <MirrorGaugeRow
                label="매달 고정비"
                valA={evalA.monthlyFixedCost}
                valB={evalB.monthlyFixedCost}
                textA={`${evalA.monthlyFixedCost}만`}
                textB={`${evalB.monthlyFixedCost}만`}
                diffText={formatSigned(diffs.fixedCostDiff, '만')}
              />
              <MirrorGaugeRow
                label="평당 고정비"
                valA={evalA.costPerPyeong}
                valB={evalB.costPerPyeong}
                textA={`${evalA.costPerPyeong}만`}
                textB={`${evalB.costPerPyeong}만`}
                diffText={formatSigned(diffs.costPerPyeongDiff, '만/평')}
              />
              <MirrorGaugeRow
                label="가게 전용면적"
                valA={candidateA.areaPyeong}
                valB={candidateB.areaPyeong}
                textA={`${candidateA.areaPyeong}평`}
                textB={`${candidateB.areaPyeong}평`}
                diffText={formatSigned(diffs.areaPyeongDiff, '평')}
              />
              <MirrorGaugeRow
                label="처음 들어가는 돈"
                valA={evalA.initialOutlayTotal}
                valB={evalB.initialOutlayTotal}
                textA={`${evalA.initialOutlayTotal.toLocaleString()}만`}
                textB={`${evalB.initialOutlayTotal.toLocaleString()}만`}
                diffText={formatSigned(diffs.initialOutlayDiff, '만')}
              />
              <MirrorGaugeRow
                label={`반경 ${criteria.radiusMeters}m 동종 밀집`}
                valA={evalA.commercial.sameIndustryDensityPct}
                valB={evalB.commercial.sameIndustryDensityPct}
                textA={`${evalA.commercial.sameIndustryDensityPct}%`}
                textB={`${evalB.commercial.sameIndustryDensityPct}%`}
                diffText={
                  industryMismatch
                    ? '업종 상이'
                    : formatSigned(diffs.densityPctDiff, '%p')
                }
              />
              {evalA.population && evalB.population && (
                <MirrorGaugeRow
                  label="행정동 거주인구"
                  note="유동인구 아님"
                  valA={evalA.population.totalPopulation}
                  valB={evalB.population.totalPopulation}
                  textA={`${(evalA.population.totalPopulation / 1000).toFixed(1)}k`}
                  textB={`${(evalB.population.totalPopulation / 1000).toFixed(1)}k`}
                  diffText={`${evalA.population.adminDong} vs ${evalB.population.adminDong}`}
                />
              )}
            </div>
          </div>

          {/* 6. 실시간 AI 결론 미리보기 & 임장노트 바로가기 */}
          <div className="rounded-[18px] border border-[#FDE68A] bg-gradient-to-br from-[#FFFBEB] via-white to-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#92400E]">
                <Bot className="h-4 w-4" />
                AI 근거 요약 · 집주인 질문 {checklistCount}개 준비됨
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
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0B0F17] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800"
            >
              AI 상세 분석 & 집주인 질문 체크리스트 열기
              <ArrowRight className="h-3.5 w-3.5 text-amber-300" />
            </button>
          </div>
        </div>
      </aside>

      {/* 우측 풀하이트 실시간 인터랙티브 지도 */}
      <div className="relative h-[460px] w-full lg:h-[calc(100vh-57px)] lg:min-w-0 lg:flex-1">
        {mapSlot}
      </div>
    </div>
  );
}
