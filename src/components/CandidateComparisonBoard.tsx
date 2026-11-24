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
  UserCriteria,
} from '@/lib/types';

interface CandidateComparisonBoardProps {
  criteria: UserCriteria;
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

function kpiBoxStyle(status: StatusLevel | undefined): string {
  if (status === 'fail') return 'border-rose-200 bg-rose-50/60';
  if (status === 'warn') return 'border-amber-200 bg-amber-50/60';
  return 'border-emerald-200/70 bg-emerald-50/35';
}

function kpiDeltaColor(status: StatusLevel | undefined): string {
  if (status === 'fail') return 'text-rose-700 font-bold';
  if (status === 'warn') return 'text-amber-700 font-bold';
  return 'text-emerald-700 font-semibold';
}

interface CandidateSummaryCardProps {
  criteria: UserCriteria;
  candidate: CandidateProperty;
  evaluation: CandidateEvaluation;
  onEdit: () => void;
}

function CandidateSummaryCard({
  criteria,
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

  const rentCheck = evaluation.checks.find((c) => c.key === 'monthlyRent');
  const areaCheck = evaluation.checks.find((c) => c.key === 'area');
  const depositCheck = evaluation.checks.find((c) => c.key === 'deposit');

  const rentDelta = candidate.monthlyRent - criteria.maxMonthlyRent;
  const areaDelta = Math.round((candidate.areaPyeong - criteria.minAreaPyeong) * 10) / 10;
  const depositDelta = candidate.deposit - criteria.maxDeposit;

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
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                candidate.industry === criteria.targetIndustry
                  ? 'bg-slate-100 text-slate-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {candidate.industry}
              {candidate.industry !== criteria.targetIndustry ? ' (희망 업종과 상이)' : ''}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                criteria.requireFirstFloor && candidate.floor !== '1층'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {candidate.floor}
              {criteria.requireFirstFloor && candidate.floor !== '1층' ? ' (1층 미충족)' : ''}
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
          직접 수정
        </button>
      </div>

      {/* 핵심 숫자 3개 — 내 기준 대비 충족/초과 상태를 색상·격차로 즉각 표시 */}
      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <div className={`rounded-xl border p-3.5 transition ${kpiBoxStyle(rentCheck?.status)}`}>
          <div className="text-xs font-medium text-slate-600">매달 나가는 돈</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">
            {evaluation.monthlyFixedCost.toLocaleString()}
            <span className="ml-0.5 text-xs font-semibold text-slate-500">만원</span>
          </div>
          <div className={`mt-1 text-[11px] tabular-nums ${kpiDeltaColor(rentCheck?.status)}`}>
            {rentDelta > 0
              ? `월세 기준 +${rentDelta.toLocaleString()}만 초과`
              : `월세 기준 ${Math.abs(rentDelta).toLocaleString()}만 여유`}
          </div>
        </div>

        <div className={`rounded-xl border p-3.5 transition ${kpiBoxStyle(areaCheck?.status)}`}>
          <div className="text-xs font-medium text-slate-600">가게 크기</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">
            {candidate.areaPyeong}
            <span className="ml-0.5 text-xs font-semibold text-slate-500">평</span>
          </div>
          <div className={`mt-1 text-[11px] tabular-nums ${kpiDeltaColor(areaCheck?.status)}`}>
            {areaDelta < 0
              ? `기준보다 ${Math.abs(areaDelta)}평 부족`
              : `기준 대비 +${areaDelta}평 여유`}
          </div>
        </div>

        <div className={`rounded-xl border p-3.5 transition ${kpiBoxStyle(depositCheck?.status)}`}>
          <div className="text-xs font-medium text-slate-600">보증금 · 처음 돈</div>
          <div className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 sm:text-2xl">
            {candidate.deposit.toLocaleString()}
            <span className="ml-0.5 text-xs font-semibold text-slate-500">만원</span>
          </div>
          <div className={`mt-1 text-[11px] tabular-nums ${kpiDeltaColor(depositCheck?.status)}`}>
            {depositDelta > 0
              ? `보증금 +${depositDelta.toLocaleString()}만 초과`
              : `총 초기금 ${evaluation.initialOutlayTotal.toLocaleString()}만`}
          </div>
        </div>
      </div>

      {/* 내 기준 충족 여부 배지 */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <span>내 조건에 맞나요?</span>
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
            {showCheckDetails ? '접기' : '자세히 보기'}
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
              * 평당 월 고정비 {evaluation.costPerPyeong}만원/평 · 보증금 연 5% 환산 월 참고치 +{evaluation.depositConvertedMonthly}만원/월
            </div>
          </div>
        )}
      </div>

      {/* 공공데이터 스냅샷 2줄 */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Store className="h-3.5 w-3.5 text-slate-400" />
              주변 {evaluation.commercial.radiusMeters}m 가게
            </span>
            <span className={`font-bold ${accentText}`}>
              {evaluation.densityLabel}
            </span>
          </div>
          <div className="mt-1.5 text-sm font-bold tabular-nums text-slate-900">
            같은 업종 {evaluation.commercial.sameIndustryCount}곳{' '}
            <span className="text-xs font-semibold text-slate-500">
              ({evaluation.commercial.sameIndustryDensityPct}% / 전체 {evaluation.commercial.totalStores}곳)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 p-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              이 동네 주민 수
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
          {candidate.fieldNotes || '현장 메모가 비어 있습니다. [직접 수정]에서 기록해 보세요.'}
        </p>
      </div>
    </article>
  );
}

export function CandidateComparisonBoard({
  criteria,
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
      sub: `내 최소 기준 ${criteria.minAreaPyeong}평 대비 비교`,
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
            위에서 바꾼 내 기준에 따라 초록(충족)·노랑(주의)·빨강(초과)으로 즉시 표시됩니다. 실제 알아본 매물이 있다면 [직접 수정]을 눌러 입력해 보세요.
          </p>
        </div>
      </div>

      {/* 좌/우 핵심 요약 카드 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CandidateSummaryCard
          criteria={criteria}
          candidate={candidateA}
          evaluation={evalA}
          onEdit={() => onEditCandidate('A')}
        />
        <CandidateSummaryCard
          criteria={criteria}
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
