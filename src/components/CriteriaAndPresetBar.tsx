'use client';

import {
  CheckCircle2,
  Compass,
  ListFilter,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useState } from 'react';
import { pyeongToSqm } from '@/lib/compareEngine';
import { PRESET_SCENARIOS } from '@/lib/presets';
import type { MatchedCatalogItem } from '@/lib/propertyCatalog';
import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  type CandidateProperty,
  type ComparisonSummary,
  type UserCriteria,
} from '@/lib/types';

interface CriteriaAndPresetBarProps {
  activePresetId: string | null;
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  rankedCatalog: MatchedCatalogItem[];
  onSelectPreset: (presetId: string) => void;
  onChangeCriteria: (next: UserCriteria) => void;
  onAutoMatchByCriteria: () => void;
  onApplyCatalogToSlot: (slot: 'A' | 'B', item: MatchedCatalogItem) => void;
}

export function CriteriaAndPresetBar({
  activePresetId,
  criteria,
  candidateA,
  candidateB,
  comparison,
  rankedCatalog,
  onSelectPreset,
  onChangeCriteria,
  onAutoMatchByCriteria,
  onApplyCatalogToSlot,
}: CriteriaAndPresetBarProps) {
  const [showCatalog, setShowCatalog] = useState(false);

  const sameIndustryPoolCount = rankedCatalog.filter((r) => r.sameIndustry).length;
  const bothDifferentFromTarget =
    candidateA.industry !== criteria.targetIndustry &&
    candidateB.industry !== criteria.targetIndustry;

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6"
      aria-label="내 창업 조건 설정 및 시연 프리셋"
    >
      {/* 상단: STEP 1 타이틀 + 빠른 1분 시연 프리셋 3종 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="rounded-full bg-[#0B0F17] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
              STEP 1
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              내 창업 조건을 설정하세요
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            조건을 바꾸면 아래 후보 A·B의 충족 판정과 AI 분석이 실시간으로 바뀌며,{' '}
            <strong className="text-slate-700">내 조건에 맞는 매물 자동 매칭</strong>도 바로 실행됩니다.
          </p>
        </div>

        {/* 반경 300m / 500m 전환 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Compass className="h-4 w-4 text-slate-400" />
            상권 반경
          </span>
          <div
            className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5"
            role="group"
            aria-label="상권 조회 반경 선택"
          >
            {([300, 500] as const).map((radius) => {
              const selected = criteria.radiusMeters === radius;
              return (
                <button
                  key={radius}
                  id={`radius-btn-${radius}`}
                  type="button"
                  onClick={() =>
                    onChangeCriteria({ ...criteria, radiusMeters: radius })
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold tabular-nums transition ${
                    selected
                      ? 'bg-[#0B0F17] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {radius}m
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 항상 보이는 5대 조건 설정 입력 바 */}
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#92400E]" />
            내 창업 기준 입력 (변경 시 판정 · AI 분석 자동 반영)
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums">
            <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-800 border border-blue-200/70">
              후보 A: 충족 {comparison.evalA.summaryCounts.pass} · 주의{' '}
              {comparison.evalA.summaryCounts.warn} · 초과{' '}
              {comparison.evalA.summaryCounts.fail}
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-200/70">
              후보 B: 충족 {comparison.evalB.summaryCounts.pass} · 주의{' '}
              {comparison.evalB.summaryCounts.warn} · 초과{' '}
              {comparison.evalB.summaryCounts.fail}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600">희망 업종</span>
            <select
              id="criteria-industry"
              value={criteria.targetIndustry}
              onChange={(e) =>
                onChangeCriteria({
                  ...criteria,
                  targetIndustry: e.target.value as BusinessCategory,
                })
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600">
              최대 보증금 (만원)
            </span>
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
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-slate-600">
              최대 월세 (만원)
            </span>
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
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>최소 면적 (평)</span>
              <span className="font-normal tabular-nums text-slate-400">
                {pyeongToSqm(criteria.minAreaPyeong)}㎡
              </span>
            </span>
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
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold tabular-nums text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="flex flex-col gap-1.5 col-span-2 sm:col-span-1">
            <span className="text-xs font-semibold text-slate-600">1층 조건</span>
            <button
              id="criteria-first-floor"
              type="button"
              onClick={() =>
                onChangeCriteria({
                  ...criteria,
                  requireFirstFloor: !criteria.requireFirstFloor,
                })
              }
              className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm font-bold transition ${
                criteria.requireFirstFloor
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{criteria.requireFirstFloor ? '1층 필수' : '층수 무관'}</span>
              <span
                className={`h-5 w-9 rounded-full p-0.5 transition ${
                  criteria.requireFirstFloor ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition ${
                    criteria.requireFirstFloor ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        {/* 조건 기반 액션 바: 자동 매칭 + 매물 풀 고르기 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200/80 pt-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-auto-match-criteria"
              type="button"
              onClick={onAutoMatchByCriteria}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0B0F17] px-4 text-xs font-bold text-white shadow-xs transition hover:bg-slate-800 sm:text-sm"
            >
              <Wand2 className="h-4 w-4 text-amber-300" />
              내 조건에 맞는 후보 A·B 자동 매칭 ({criteria.targetIndustry} {sameIndustryPoolCount}곳)
            </button>

            <button
              id="btn-toggle-catalog"
              type="button"
              onClick={() => setShowCatalog((v) => !v)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition ${
                showCatalog
                  ? 'border-blue-300 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <ListFilter className="h-4 w-4" />
              조건별 추천 매물 직접 고르기 ({rankedCatalog.length}곳)
            </button>
          </div>

          {bothDifferentFromTarget && (
            <button
              type="button"
              onClick={onAutoMatchByCriteria}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              희망 업종({criteria.targetIndustry}) 매물로 바로 바꾸기 →
            </button>
          )}
        </div>

        {/* 조건별 정렬된 매물 카탈로그 선택기 */}
        {showCatalog && (
          <div className="mt-3.5 space-y-2 border-t border-slate-200 pt-3.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                현재 설정한 <strong>내 기준 충족 항목이 많은 순서</strong>로 정렬되었습니다. 원하는 매물을 후보 A 또는 B에 바로 넣어보세요.
              </span>
              <span className="font-semibold text-slate-600">
                총 {rankedCatalog.length}개 샘플 매물
              </span>
            </div>
            <div className="grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
              {rankedCatalog.map((item) => {
                const { listing } = item;
                const isSelectedA = candidateA.name === listing.name;
                const isSelectedB = candidateB.name === listing.name;
                return (
                  <div
                    key={listing.id}
                    className={`flex flex-col justify-between gap-2 rounded-xl border p-3 transition ${
                      item.sameIndustry
                        ? 'border-slate-200 bg-white'
                        : 'border-slate-200/60 bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                              item.sameIndustry
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {listing.industry}
                          </span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
                            {listing.regionTag} · {listing.floor}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          충족 {item.passCount}
                          {item.failCount > 0 && (
                            <span className="text-rose-600">
                              · 초과 {item.failCount}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-bold text-slate-900">
                        {listing.name}
                      </div>
                      <div className="mt-0.5 text-xs tabular-nums text-slate-500">
                        월 고정비 {item.monthlyFixedCost}만원 · 보증금{' '}
                        {listing.deposit.toLocaleString()}만원 · {listing.areaPyeong}평
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onApplyCatalogToSlot('A', item)}
                        className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                          isSelectedA
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {isSelectedA ? '현재 후보 A' : '후보 A로 넣기'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onApplyCatalogToSlot('B', item)}
                        className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                          isSelectedB
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {isSelectedB ? '현재 후보 B' : '후보 B로 넣기'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 하단: 1분 심사 시연용 프리셋 3종 (빠른 원클릭 전환) */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          1분 시연 프리셋:
        </span>
        {PRESET_SCENARIOS.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              id={`preset-btn-${preset.id}`}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                isActive
                  ? 'border-[#0B0F17] bg-[#0B0F17] text-white shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={
                  isActive
                    ? 'text-amber-300'
                    : preset.id === 'preset3'
                      ? 'text-amber-700'
                      : 'text-slate-400'
                }
              >
                {preset.shortLabel}
              </span>
              <span>{preset.title}</span>
            </button>
          );
        })}
        {activePresetId === null && (
          <span className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
            사용자 맞춤 조건 모드
          </span>
        )}
      </div>
    </section>
  );
}
