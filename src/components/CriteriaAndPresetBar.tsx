'use client';

import { Compass, RotateCcw, SlidersHorizontal, Sparkles } from 'lucide-react';
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
  const activePreset = PRESET_SCENARIOS.find((p) => p.id === activePresetId);

  return (
    <section className="space-y-3" aria-label="원클릭 시연 프리셋 및 창업 기준 설정">
      {/* 원클릭 시연 프리셋 바 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">
              원클릭 1분 시연 프리셋
            </h2>
            <span className="text-xs text-slate-500">
              클릭 시 후보 A·B 매물, 지도 반경, 차트, AI 검증이 즉시 갱신됩니다
            </span>
          </div>
          {activePreset && (
            <button
              type="button"
              onClick={onResetCurrentPreset}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <RotateCcw className="h-3 w-3" />
              현재 프리셋 초기화
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          {PRESET_SCENARIOS.map((preset) => {
            const isActive = preset.id === activePresetId;
            return (
              <button
                key={preset.id}
                id={`preset-btn-${preset.id}`}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                className={`group flex flex-col items-start rounded-xl border p-3 text-left transition ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                    : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      isActive
                        ? 'bg-white/15 text-white'
                        : preset.id === 'preset3'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    {preset.shortLabel}
                  </span>
                  {isActive && (
                    <span className="text-[11px] font-medium text-blue-200">
                      선택됨
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-sm font-semibold">{preset.title}</div>
                <div
                  className={`mt-0.5 text-xs leading-snug ${
                    isActive ? 'text-slate-300' : 'text-slate-500'
                  }`}
                >
                  {preset.subtitle}
                </div>
              </button>
            );
          })}
        </div>

        {activePreset && (
          <div className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">시연 포인트:</span>{' '}
            {activePreset.demoPoint}
          </div>
        )}
      </div>

      {/* 내 창업 기준 설정 바 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              내 창업 기준 설정
            </h2>
            <span className="text-xs text-slate-500">
              기준 변경 시 후보 A·B 충족(Pass)/주의(Warn)/초과(Fail) 판정이 실시간 반영됩니다
            </span>
          </div>

          {/* 상권 조회 반경 스위치 (300m / 500m) */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
              <Compass className="h-3.5 w-3.5 text-slate-500" />
              상권 조회 반경
            </span>
            <div
              className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
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
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                      selected
                        ? 'bg-white text-slate-900 shadow-xs'
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* 희망 업종 */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600">
              희망 업종
            </span>
            <select
              id="criteria-industry"
              value={criteria.targetIndustry}
              onChange={(e) =>
                onChangeCriteria({
                  ...criteria,
                  targetIndustry: e.target.value as BusinessCategory,
                })
              }
              className="h-9 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            >
              {BUSINESS_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>

          {/* 최대 보증금 */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600">
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
              className="h-9 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-semibold tabular-nums text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {/* 최대 월세 */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600">
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
              className="h-9 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-semibold tabular-nums text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {/* 최소 희망 면적 */}
          <label className="flex flex-col gap-1">
            <span className="flex items-center justify-between text-[11px] font-medium text-slate-600">
              <span>최소 면적 (평)</span>
              <span className="tabular-nums text-[10px] text-slate-400">
                ≈ {pyeongToSqm(criteria.minAreaPyeong)}㎡
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
              className="h-9 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs font-semibold tabular-nums text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>

          {/* 1층 필수 여부 */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600">
              1층 입지 조건
            </span>
            <button
              id="criteria-first-floor"
              type="button"
              onClick={() =>
                onChangeCriteria({
                  ...criteria,
                  requireFirstFloor: !criteria.requireFirstFloor,
                })
              }
              className={`flex h-9 items-center justify-between rounded-lg border px-3 text-xs font-semibold transition ${
                criteria.requireFirstFloor
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{criteria.requireFirstFloor ? '1층 필수' : '층수 무관'}</span>
              <span
                className={`h-4 w-7 rounded-full p-0.5 transition ${
                  criteria.requireFirstFloor ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`block h-3 w-3 rounded-full bg-white transition ${
                    criteria.requireFirstFloor ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
