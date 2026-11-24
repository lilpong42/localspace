'use client';

import {
  ChevronDown,
  ChevronUp,
  Compass,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import { pyeongToSqm } from '@/lib/compareEngine';
import { PRESET_SCENARIOS } from '@/lib/presets';
import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  type UserCriteria,
} from '@/lib/types';

interface CriteriaAndPresetBarProps {
  activePresetId: string | null;
  criteria: UserCriteria;
  onSelectPreset: (presetId: string) => void;
  onChangeCriteria: (next: UserCriteria) => void;
  onResetCurrentPreset: () => void;
}

export function CriteriaAndPresetBar({
  activePresetId,
  criteria,
  onSelectPreset,
  onChangeCriteria,
  onResetCurrentPreset,
}: CriteriaAndPresetBarProps) {
  const [showCriteriaEditor, setShowCriteriaEditor] = useState(false);

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6"
      aria-label="시나리오 선택 및 내 창업 기준"
    >
      {/* STEP 1 타이틀 & 쉬운 사용 안내 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="rounded-full bg-[#0B0F17] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
              STEP 1
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              비교할 시나리오를 골라보세요
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            예시 3가지 중 하나를 클릭하면 후보 A·B의 비용, 상권 지도, AI 체크리스트가 한 번에 비교됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetCurrentPreset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          기본값으로 되돌리기
        </button>
      </div>

      {/* 원클릭 시연 프리셋 3종 (넉넉하고 읽기 쉬운 카드) */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {PRESET_SCENARIOS.map((preset) => {
          const isActive = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              id={`preset-btn-${preset.id}`}
              type="button"
              onClick={() => onSelectPreset(preset.id)}
              className={`flex flex-col items-start rounded-xl border p-4 text-left transition ${
                isActive
                  ? 'border-[#0B0F17] bg-[#0B0F17] text-white shadow-sm'
                  : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300'
                      : preset.id === 'preset3'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {preset.shortLabel}
                </span>
                {isActive && (
                  <span className="text-xs font-semibold text-amber-300">
                    현재 선택됨
                  </span>
                )}
              </div>
              <div className="mt-2.5 text-[15px] font-bold leading-snug">
                {preset.title}
              </div>
              <div
                className={`mt-1 text-xs leading-relaxed ${
                  isActive ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {preset.subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* 내 창업 기준 한눈에 보기 요약 바 (기본은 깔끔한 칩, 클릭 시 수정 패널 열림) */}
      <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-bold text-slate-800">내 기준:</span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 border border-slate-200">
              {criteria.targetIndustry}
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 border border-slate-200">
              보증금 ≤ {criteria.maxDeposit.toLocaleString()}만
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 border border-slate-200">
              월세 ≤ {criteria.maxMonthlyRent.toLocaleString()}만
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 border border-slate-200">
              면적 ≥ {criteria.minAreaPyeong}평
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
              {criteria.requireFirstFloor ? '1층 필수' : '층수 무관'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 반경 300m / 500m 즉시 전환 */}
            <div className="flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-slate-500" />
              <div
                className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
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
                      className={`rounded-md px-2.5 py-1 text-xs font-bold tabular-nums transition ${
                        selected
                          ? 'bg-[#0B0F17] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      반경 {radius}m
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              id="btn-toggle-criteria-editor"
              type="button"
              onClick={() => setShowCriteriaEditor((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                showCriteriaEditor
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              내 기준 바꾸기
              {showCriteriaEditor ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 펼쳤을 때만 나타나는 여유로운 기준 편집 폼 */}
        {showCriteriaEditor && (
          <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3.5 sm:grid-cols-3 lg:grid-cols-5">
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
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500"
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
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500"
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
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500"
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
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500"
              />
            </label>

            <div className="flex flex-col gap-1.5">
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
                className={`flex h-10 items-center justify-between rounded-xl border px-3.5 text-sm font-semibold transition ${
                  criteria.requireFirstFloor
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-600'
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
        )}
      </div>
    </section>
  );
}
