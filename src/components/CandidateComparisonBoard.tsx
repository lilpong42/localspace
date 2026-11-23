'use client';

import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  MapPin,
  Scale,
  Store,
  Users,
} from 'lucide-react';
import {
  formatSigned,
  getCategoryRatioList,
  pyeongToSqm,
  sqmToPyeong,
} from '@/lib/compareEngine';
import { QUICK_ADDRESS_OPTIONS } from '@/lib/presets';
import {
  BUSINESS_CATEGORIES,
  FLOOR_OPTIONS,
  type BusinessCategory,
  type CandidateEvaluation,
  type CandidateProperty,
  type ComparisonSummary,
  type FloorOption,
  type PopulationRecord,
  type StatusLevel,
} from '@/lib/types';

interface CandidateComparisonBoardProps {
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  populations: PopulationRecord[];
  onChangeA: (next: CandidateProperty) => void;
  onChangeB: (next: CandidateProperty) => void;
}

function StatusBadge({
  status,
  label,
}: {
  status: StatusLevel;
  label: string;
}) {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (status === 'warn') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
      <AlertCircle className="h-3 w-3" />
      {label}
    </span>
  );
}

interface CandidateCardProps {
  candidate: CandidateProperty;
  evaluation: CandidateEvaluation;
  populations: PopulationRecord[];
  onChange: (next: CandidateProperty) => void;
}

function CandidateCard({
  candidate,
  evaluation,
  populations,
  onChange,
}: CandidateCardProps) {
  const isA = candidate.slot === 'A';
  const accentPill = isA
    ? 'bg-blue-600 text-white'
    : 'bg-emerald-600 text-white';
  const accentSoft = isA
    ? 'border-blue-200/80 bg-blue-50/40'
    : 'border-emerald-200/80 bg-emerald-50/40';
  const barColor = isA ? 'bg-blue-600' : 'bg-emerald-600';

  const categoryRatios = getCategoryRatioList(evaluation.commercial);
  const maxCatCount = Math.max(1, ...categoryRatios.map((c) => c.count));

  const handleQuickAddress = (addressValue: string) => {
    const found = QUICK_ADDRESS_OPTIONS.find((opt) => opt.address === addressValue);
    if (!found) return;
    onChange({
      ...candidate,
      address: found.address,
      adminDongKey: found.adminDongKey,
      lat: found.lat,
      lng: found.lng,
    });
  };

  return (
    <article
      className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-xs"
      aria-label={`후보 ${candidate.slot} 상세 비교 카드`}
    >
      {/* 카드 헤더 */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b px-4 py-3 ${accentSoft}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${accentPill}`}
          >
            {candidate.slot}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              후보 {candidate.slot} · 실매물 조건
            </div>
            <input
              id={`candidate-${candidate.slot}-name`}
              type="text"
              value={candidate.name}
              onChange={(e) => onChange({ ...candidate, name: e.target.value })}
              aria-label={`후보 ${candidate.slot} 이름`}
              className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none focus:underline"
            />
          </div>
        </div>

        {/* 정량 충족 요약 카운트 (점수/순위 없음!) */}
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tabular-nums">
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700 border border-emerald-200/80">
            충족 {evaluation.summaryCounts.pass}
          </span>
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700 border border-amber-200/80">
            주의 {evaluation.summaryCounts.warn}
          </span>
          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-rose-700 border border-rose-200/80">
            초과 {evaluation.summaryCounts.fail}
          </span>
        </div>
      </div>

      {/* 본문: 동일한 행 구조로 좌/우 대조 */}
      <div className="flex flex-1 flex-col divide-y divide-slate-100">
        {/* 1. 위치·주소·행정동·좌표 (카카오 주소 검색 스타일 퀵 피커 + 직접 입력) */}
        <div className="space-y-2.5 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              위치 및 조회 단위
            </span>
            <select
              aria-label={`후보 ${candidate.slot} 빠른 주소 선택`}
              value={
                QUICK_ADDRESS_OPTIONS.some((o) => o.address === candidate.address)
                  ? candidate.address
                  : ''
              }
              onChange={(e) => handleQuickAddress(e.target.value)}
              className="max-w-[220px] truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="">주소 퀵 피커 (시연용 내장 좌표)</option>
              {QUICK_ADDRESS_OPTIONS.map((opt) => (
                <option key={opt.address} value={opt.address}>
                  [{opt.regionTag}] {opt.address}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[11px] text-slate-500">도로명 주소 (직접 입력 가능)</span>
              <input
                type="text"
                value={candidate.address}
                onChange={(e) => onChange({ ...candidate, address: e.target.value })}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">행정동 (거주인구 기준)</span>
              <select
                value={candidate.adminDongKey}
                onChange={(e) =>
                  onChange({ ...candidate, adminDongKey: e.target.value })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              >
                {populations.map((pop) => (
                  <option key={pop.key} value={pop.key}>
                    {pop.sigungu} {pop.adminDong} ({pop.sido.slice(0, 2)})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">위도 (Lat)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={candidate.lat}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      lat: Number.parseFloat(e.target.value) || candidate.lat,
                    })
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-mono tabular-nums text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">경도 (Lng)</span>
                <input
                  type="number"
                  step="0.0001"
                  value={candidate.lng}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      lng: Number.parseFloat(e.target.value) || candidate.lng,
                    })
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-mono tabular-nums text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>
            </div>
          </div>
        </div>

        {/* 2. 임대 조건 · 면적 · 초기비용 */}
        <div className="space-y-2.5 p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              실매물 임대·면적 조건
            </span>
            <span className="text-[11px] text-slate-500">
              평당 월 고정비{' '}
              <strong className="font-semibold tabular-nums text-slate-900">
                {evaluation.costPerPyeong.toLocaleString()}만원/평
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">매물 업종</span>
              <select
                id={`candidate-${candidate.slot}-industry`}
                value={candidate.industry}
                onChange={(e) =>
                  onChange({
                    ...candidate,
                    industry: e.target.value as BusinessCategory,
                  })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              >
                {BUSINESS_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">층수</span>
              <select
                value={candidate.floor}
                onChange={(e) =>
                  onChange({ ...candidate, floor: e.target.value as FloorOption })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              >
                {FLOOR_OPTIONS.map((fl) => (
                  <option key={fl} value={fl}>
                    {fl}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">보증금 (만원)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={candidate.deposit}
                onChange={(e) =>
                  onChange({
                    ...candidate,
                    deposit: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">월세 (만원)</span>
              <input
                type="number"
                min={0}
                step={5}
                value={candidate.monthlyRent}
                onChange={(e) =>
                  onChange({
                    ...candidate,
                    monthlyRent: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">관리비 (만원)</span>
              <input
                type="number"
                min={0}
                step={1}
                value={candidate.maintenanceFee}
                onChange={(e) =>
                  onChange({
                    ...candidate,
                    maintenanceFee: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </label>

            {/* 전용면적 평 <-> ㎡ 자동 환산 */}
            <div className="grid grid-cols-2 gap-1">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">면적(평)</span>
                <input
                  type="number"
                  min={1}
                  step={0.5}
                  value={candidate.areaPyeong}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      areaPyeong: Math.max(0.5, Number(e.target.value) || 0.5),
                    })
                  }
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 text-xs font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500">면적(㎡)</span>
                <input
                  type="number"
                  min={3}
                  step={1}
                  value={pyeongToSqm(candidate.areaPyeong)}
                  onChange={(e) => {
                    const sqm = Math.max(3, Number(e.target.value) || 3);
                    onChange({ ...candidate, areaPyeong: sqmToPyeong(sqm) });
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-1.5 text-xs tabular-nums text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">권리금 (만원)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={candidate.keyMoney}
                onChange={(e) =>
                  onChange({
                    ...candidate,
                    keyMoney: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500">예상 수리비 (만원)</span>
              <input
                type="number"
                min={0}
                step={100}
                value={candidate.repairCost}
                onChange={(e) =>
                  onChange({
                    ...candidate,
                    repairCost: Math.max(0, Number(e.target.value) || 0),
                  })
                }
                className="h-8 rounded-lg border border-slate-200 bg-slate-50/70 px-2 text-xs tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </label>

            <div className="flex flex-col justify-center rounded-lg bg-slate-50 px-2.5 py-1.5">
              <span className="text-[10px] text-slate-500">초기 투입 합계</span>
              <span className="text-xs font-bold tabular-nums text-slate-900">
                {evaluation.initialOutlayTotal.toLocaleString()}만원
              </span>
            </div>
          </div>

          {/* 월 고정비 & 보증금 환산 참고치 요약 */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 text-center">
            <div>
              <div className="text-[10px] text-slate-500">월 고정비(월세+관리)</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                {evaluation.monthlyFixedCost.toLocaleString()}만원
              </div>
            </div>
            <div className="border-x border-slate-200/80 px-1">
              <div className="text-[10px] text-slate-500">보증금 환산(연5%참고)</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-700">
                +{evaluation.depositConvertedMonthly}만원/월
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">환산 월부담 참고치</div>
              <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
                {evaluation.totalEffectiveMonthlyRef.toLocaleString()}만원
              </div>
            </div>
          </div>
        </div>

        {/* 3. 정량 조건 정합성 진단 (Rule-based Pass/Warn/Fail) */}
        <div className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-800">
              정량 기준 정합성 진단 (억지 순위·총점 미사용)
            </span>
            <span className="text-[11px] text-slate-400">항목별 개별 판정</span>
          </div>
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/40">
            {evaluation.checks.map((check) => (
              <div
                key={check.key}
                className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      {check.label}
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {check.actualText}{' '}
                      <span className="text-slate-400">({check.targetText})</span>
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-slate-500" title={check.detail}>
                    {check.detail}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={check.status} label={check.statusLabel} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. 반경 내 공공 상권 요약 + 행정동 거주 배후인구 */}
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {/* 상권 (반경 기준) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                <Store className="h-3.5 w-3.5 text-slate-500" />
                반경 {evaluation.commercial.radiusMeters}m 상권
              </span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                반경 기준
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <div className="text-[10px] text-slate-500">전체 점포</div>
                <div className="text-base font-bold tabular-nums text-slate-900">
                  {evaluation.commercial.totalStores}개
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-500">
                  동종({candidate.industry})
                </div>
                <div className="text-base font-bold tabular-nums text-slate-900">
                  {evaluation.commercial.sameIndustryCount}개{' '}
                  <span className="text-xs font-semibold text-slate-500">
                    ({evaluation.commercial.sameIndustryDensityPct}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 space-y-1.5">
              {categoryRatios.map((item) => (
                <div key={item.category} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-16 shrink-0 truncate ${
                      item.category === candidate.industry
                        ? 'font-semibold text-slate-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.category}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        item.category === candidate.industry ? barColor : 'bg-slate-400/70'
                      }`}
                      style={{ width: `${(item.count / maxCatCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right tabular-nums text-slate-600">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 거주 배후인구 (행정동 기준) */}
          <div className="rounded-lg border border-slate-200/80 bg-white p-3">
            <div className="flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                <Users className="h-3.5 w-3.5 text-slate-500" />
                거주 배후인구
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                행정동 · 유동인구 아님
              </span>
            </div>

            {evaluation.population ? (
              <>
                <div className="mt-2 flex items-baseline justify-between">
                  <div>
                    <div className="text-[10px] text-slate-500">
                      {evaluation.population.sigungu} {evaluation.population.adminDong}
                    </div>
                    <div className="text-base font-bold tabular-nums text-slate-900">
                      {evaluation.population.totalPopulation.toLocaleString()}명
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">세대수</div>
                    <div className="text-xs font-semibold tabular-nums text-slate-700">
                      {evaluation.population.households.toLocaleString()}세대
                    </div>
                  </div>
                </div>

                {/* 연령대 비율 바 */}
                <div className="mt-3 space-y-1.5">
                  {[
                    { label: '20대', pct: evaluation.population.age20Pct, cls: 'bg-sky-500' },
                    { label: '30대', pct: evaluation.population.age30Pct, cls: 'bg-blue-600' },
                    { label: '40대', pct: evaluation.population.age40Pct, cls: 'bg-slate-500' },
                    { label: '50대+', pct: evaluation.population.age50PlusPct, cls: 'bg-slate-700' },
                  ].map((age) => (
                    <div key={age.label} className="flex items-center gap-2 text-[11px]">
                      <span className="w-10 shrink-0 text-slate-500">{age.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${age.cls}`}
                          style={{ width: `${Math.min(100, age.pct)}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right tabular-nums text-slate-700">
                        {age.pct}%
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  기준시점 {evaluation.population.referenceDate} · 주민등록 거주지 기준 참고치
                </p>
              </>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                선택한 행정동의 거주인구 샘플 자료가 없습니다.
              </p>
            )}
          </div>
        </div>

        {/* 5. 현장 방문 임장 메모 */}
        <div className="p-4">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>현장 방문 메모 (임장 기록 · AI 근거 반영)</span>
              <span className="text-[10px] font-normal text-slate-400">
                배수·덕트·주차·렌트프리 등 현장 특이사항 입력
              </span>
            </span>
            <textarea
              id={`candidate-${candidate.slot}-notes`}
              rows={3}
              value={candidate.fieldNotes}
              onChange={(e) =>
                onChange({ ...candidate, fieldNotes: e.target.value })
              }
              placeholder="현장에서 확인한 배수·전기·덕트·보행 흐름·임대인 협의 조건을 기록하세요."
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 text-xs leading-relaxed text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </div>
    </article>
  );
}

export function CandidateComparisonBoard({
  candidateA,
  candidateB,
  comparison,
  populations,
  onChangeA,
  onChangeB,
}: CandidateComparisonBoardProps) {
  const { diffs, evalA, evalB, industryMismatch } = comparison;

  return (
    <section className="space-y-3" aria-label="후보 A vs 후보 B 병렬 비교 보드">
      {/* 정량 격차 원장 (100점 총점/1등 순위 대신 객관적 수치 격차 표기) */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              후보 A 대비 후보 B 핵심 정량 격차 (B − A)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            순위 산출 없이 비용·면적·초기자금·상권 차이만 병렬 표기
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[11px] text-slate-500">월 고정비 격차</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatSigned(diffs.fixedCostDiff, '만원')}
            </div>
            <div className="text-[10px] tabular-nums text-slate-500">
              A {evalA.monthlyFixedCost}만 vs B {evalB.monthlyFixedCost}만
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[11px] text-slate-500">평당 월 고정비</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatSigned(diffs.costPerPyeongDiff, '만원/평')}
            </div>
            <div className="text-[10px] tabular-nums text-slate-500">
              A {evalA.costPerPyeong} vs B {evalB.costPerPyeong}
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[11px] text-slate-500">전용면적 격차</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatSigned(diffs.areaPyeongDiff, '평')}
            </div>
            <div className="text-[10px] tabular-nums text-slate-500">
              A {candidateA.areaPyeong}평 vs B {candidateB.areaPyeong}평
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
            <div className="text-[11px] text-slate-500">초기 투입 총액 격차</div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatSigned(diffs.initialOutlayDiff, '만원')}
            </div>
            <div className="text-[10px] tabular-nums text-slate-500">
              A {evalA.initialOutlayTotal.toLocaleString()}만 vs B{' '}
              {evalB.initialOutlayTotal.toLocaleString()}만
            </div>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 col-span-2 sm:col-span-1">
            <div className="text-[11px] text-slate-500">
              반경 동종 밀집도 {industryMismatch ? '(업종 상이)' : ''}
            </div>
            <div className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {industryMismatch
                ? '단순 비교 보류'
                : formatSigned(diffs.densityPctDiff, '%p')}
            </div>
            <div className="text-[10px] tabular-nums text-slate-500">
              A {evalA.commercial.sameIndustryDensityPct}% vs B{' '}
              {evalB.commercial.sameIndustryDensityPct}%
            </div>
          </div>
        </div>
      </div>

      {/* 좌/우 2단 병렬 비교 카드 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CandidateCard
          candidate={candidateA}
          evaluation={evalA}
          populations={populations}
          onChange={onChangeA}
        />
        <CandidateCard
          candidate={candidateB}
          evaluation={evalB}
          populations={populations}
          onChange={onChangeB}
        />
      </div>
    </section>
  );
}
