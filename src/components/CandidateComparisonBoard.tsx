'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Pencil,
  Store,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { formatSigned } from '@/lib/compareEngine';
import type {
  CandidateEvaluation,
  CandidateProperty,
  ComparisonSummary,
  StatusLevel,
} from '@/lib/types';

interface CandidateComparisonBoardProps {
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  onEditCandidate: (slot: 'A' | 'B') => void;
}

function StatusPill({
  status,
  label,
}: {
  status: StatusLevel;
  label: string;
}) {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }
  if (status === 'warn') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
      <AlertCircle className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

interface CandidateSummaryCardProps {
  candidate: CandidateProperty;
  evaluation: CandidateEvaluation;
  onEdit: () => void;
}

function CandidateSummaryCard({
  candidate,
  evaluation,
  onEdit,
}: CandidateSummaryCardProps) {
  const [showCheckDetails, setShowCheckDetails] = useState(false);

  const isA = candidate.slot === 'A';
  const badgeBg = isA ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';
  const topBorder = isA ? 'border-t-blue-600' : 'border-t-emerald-600';
  const accentText = isA ? 'text-blue-700' : 'text-emerald-700';

  const pop = evaluation.population;
  const youngPct = pop ? (pop.age20Pct + pop.age30Pct).toFixed(1) : null;

  return (
    <article
      className={`flex flex-col rounded-2xl border border-slate-200/90 border-t-4 ${topBorder} bg-white p-5 shadow-xs sm:p-6`}
      aria-label={`후보 ${candidate.slot} 요약 카드`}
    >
      {/* 상단: 후보 이름 + 업종/층수 + 조건 수정 버튼 */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${badgeBg}`}
            >
              {candidate.slot}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {candidate.industry}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
              {candidate.floor}
            </span>
          </div>
          <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
            {candidate.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{candidate.address}</span>
          </p>
        </div>

        <button
          id={`btn-edit-candidate-${candidate.slot}`}
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
        >
          <Pencil className="h-3.5 w-3.5" />
          조건·메모 수정
        </button>
      </div>

      {/* 핵심 숫자 3개 (큰 글씨로 한눈에 비교) */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="text-xs font-medium text-slate-500">월 고정비</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">
            {evaluation.monthlyFixedCost.toLocaleString()}
            <span className="ml-0.5 text-xs font-semibold text-slate-500">만원</span>
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            평당 {evaluation.costPerPyeong}만원
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="text-xs font-medium text-slate-500">전용면적</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">
            {candidate.areaPyeong}
            <span className="ml-0.5 text-xs font-semibold text-slate-500">평</span>
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            {evaluation.areaSqm}㎡
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5">
          <div className="text-xs font-medium text-slate-500">초기 투입금</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">
            {evaluation.initialOutlayTotal.toLocaleString()}
            <span className="ml-0.5 text-xs font-semibold text-slate-500">만원</span>
          </div>
          <div className="mt-1 text-[11px] tabular-nums text-slate-500">
            보증 {candidate.deposit.toLocaleString()} · 수리 {candidate.repairCost.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 내 기준 충족 여부 배지 (억지 총점/순위 없이 항목별 판정) */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span>내 기준 진단</span>
            <span className="font-semibold tabular-nums text-emerald-700">
              충족 {evaluation.summaryCounts.pass}
            </span>
            {evaluation.summaryCounts.warn > 0 && (
              <span className="font-semibold tabular-nums text-amber-700">
                주의 {evaluation.summaryCounts.warn}
              </span>
            )}
            {evaluation.summaryCounts.fail > 0 && (
              <span className="font-semibold tabular-nums text-rose-700">
                초과 {evaluation.summaryCounts.fail}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCheckDetails((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900"
          >
            {showCheckDetails ? '간단히' : '상세 보기'}
            {showCheckDetails ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {evaluation.checks.map((c) => (
            <StatusPill
              key={c.key}
              status={c.status}
              label={`${c.label.replace(/\s*\(.+\)/, '')} ${c.statusLabel}`}
            />
          ))}
        </div>

        {showCheckDetails && (
          <div className="mt-3 space-y-1.5 border-t border-slate-200/70 pt-2.5 text-xs text-slate-600">
            {evaluation.checks.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-800 shrink-0">
                  {c.label}:
                </span>
                <span className="text-right leading-snug">{c.detail}</span>
              </div>
            ))}
            <div className="pt-1 text-[11px] text-slate-400">
              * 보증금 연 5% 환산 월 참고치: +{evaluation.depositConvertedMonthly}만원/월 (환산 월부담 {evaluation.totalEffectiveMonthlyRef.toLocaleString()}만원)
            </div>
          </div>
        )}
      </div>

      {/* 공공데이터 스냅샷 2줄 (상권 반경 vs 행정동 거주인구 명확 구분) */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Store className="h-3.5 w-3.5 text-slate-400" />
              반경 {evaluation.commercial.radiusMeters}m 상권
            </span>
            <span className={`font-bold ${accentText}`}>
              {evaluation.densityLabel}
            </span>
          </div>
          <div className="mt-1.5 text-sm font-bold tabular-nums text-slate-900">
            동종 {evaluation.commercial.sameIndustryCount}개{' '}
            <span className="text-xs font-semibold text-slate-500">
              ({evaluation.commercial.sameIndustryDensityPct}% / 전체 {evaluation.commercial.totalStores}개)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              행정동 거주인구
            </span>
            <span className="text-[11px] text-slate-400">유동인구 아님</span>
          </div>
          <div className="mt-1.5 text-sm font-bold tabular-nums text-slate-900">
            {pop ? (
              <>
                {pop.adminDong} {pop.totalPopulation.toLocaleString()}명{' '}
                <span className="text-xs font-semibold text-slate-500">
                  (20·30대 {youngPct}%)
                </span>
              </>
            ) : (
              '인구 자료 없음'
            )}
          </div>
        </div>
      </div>

      {/* 현장 방문 메모 */}
      <div className="mt-4 flex-1 rounded-xl border border-[#FDE68A]/70 bg-[#FFFBEB]/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#92400E]">
          <FileText className="h-3.5 w-3.5" />
          현장 방문 메모
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">
          {candidate.fieldNotes || '현장 메모가 비어 있습니다. [조건·메모 수정]에서 기록해 보세요.'}
        </p>
      </div>
    </article>
  );
}

export function CandidateComparisonBoard({
  candidateA,
  candidateB,
  comparison,
  onEditCandidate,
}: CandidateComparisonBoardProps) {
  const { evalA, evalB, diffs, industryMismatch } = comparison;

  const rows = [
    {
      label: '월 고정비 (월세+관리비)',
      a: `${evalA.monthlyFixedCost.toLocaleString()}만원`,
      b: `${evalB.monthlyFixedCost.toLocaleString()}만원`,
      diff: formatSigned(diffs.fixedCostDiff, '만원'),
      sub: `월세 ${candidateA.monthlyRent}+관리 ${candidateA.maintenanceFee} vs ${candidateB.monthlyRent}+${candidateB.maintenanceFee}`,
    },
    {
      label: '평당 월 고정비',
      a: `${evalA.costPerPyeong}만원/평`,
      b: `${evalB.costPerPyeong}만원/평`,
      diff: formatSigned(diffs.costPerPyeongDiff, '만원/평'),
      sub: '면적 대비 실제 월 임대 효율 비교',
    },
    {
      label: '전용면적',
      a: `${candidateA.areaPyeong}평 (${evalA.areaSqm}㎡)`,
      b: `${candidateB.areaPyeong}평 (${evalB.areaSqm}㎡)`,
      diff: formatSigned(diffs.areaPyeongDiff, '평'),
      sub: '실사용 전용면적 기준',
    },
    {
      label: '초기 투입금 합계',
      a: `${evalA.initialOutlayTotal.toLocaleString()}만원`,
      b: `${evalB.initialOutlayTotal.toLocaleString()}만원`,
      diff: formatSigned(diffs.initialOutlayDiff, '만원'),
      sub: '보증금 + 권리금 + 예상 수리비',
    },
    {
      label: `반경 ${evalA.commercial.radiusMeters}m 동종 밀집도`,
      a: `${evalA.commercial.sameIndustryCount}개 (${evalA.commercial.sameIndustryDensityPct}%)`,
      b: `${evalB.commercial.sameIndustryCount}개 (${evalB.commercial.sameIndustryDensityPct}%)`,
      diff: industryMismatch
        ? '업종 상이 · 단순 비교 보류'
        : formatSigned(diffs.densityPctDiff, '%p'),
      sub: industryMismatch
        ? `${candidateA.industry} vs ${candidateB.industry}`
        : `전체 점포 A ${evalA.commercial.totalStores}개 vs B ${evalB.commercial.totalStores}개`,
    },
  ];

  return (
    <section className="space-y-4" aria-label="후보 A vs 후보 B 한눈에 비교">
      {/* STEP 2 타이틀 */}
      <div className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <div className="inline-flex items-center gap-2">
            <span className="rounded-full bg-[#0B0F17] px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-300">
              STEP 2
            </span>
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              후보 A와 후보 B를 한눈에 비교해 보세요
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            억지 순위 대신 핵심 비용·면적·상권·현장 메모를 나란히 대조합니다. 각 카드 오른쪽 버튼으로 내 매물 조건을 바로 수정할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 좌/우 핵심 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CandidateSummaryCard
          candidate={candidateA}
          evaluation={evalA}
          onEdit={() => onEditCandidate('A')}
        />
        <CandidateSummaryCard
          candidate={candidateB}
          evaluation={evalB}
          onEdit={() => onEditCandidate('B')}
        />
      </div>

      {/* 핵심 항목 A vs B 한눈에 대조표 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-slate-900">
            핵심 수치 격차 비교표 (후보 A 대비 후보 B)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-500">
                <th className="px-5 py-3">비교 항목</th>
                <th className="px-4 py-3 text-blue-700">후보 A</th>
                <th className="px-4 py-3 text-emerald-700">후보 B</th>
                <th className="px-5 py-3 text-right text-slate-700">차이 (B − A)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900">{row.label}</div>
                    <div className="text-xs text-slate-400">{row.sub}</div>
                  </td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums text-slate-800">
                    {row.a}
                  </td>
                  <td className="px-4 py-3.5 font-semibold tabular-nums text-slate-800">
                    {row.b}
                  </td>
                  <td className="px-5 py-3.5 text-right font-bold tabular-nums text-slate-900">
                    {row.diff}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
