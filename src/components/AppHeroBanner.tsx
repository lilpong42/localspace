'use client';

import { ArrowRight, CheckCircle2, HelpCircle, MapPin, Pencil } from 'lucide-react';
import { formatSigned } from '@/lib/compareEngine';
import type { CandidateProperty, ComparisonSummary } from '@/lib/types';

interface AppHeroBannerProps {
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  onStartCustomInput: () => void;
  onJumpToCompare: () => void;
}

export function AppHeroBanner({
  candidateA,
  candidateB,
  comparison,
  onStartCustomInput,
  onJumpToCompare,
}: AppHeroBannerProps) {
  const { evalA, evalB, diffs, industryMismatch } = comparison;

  const headlineInsight = industryMismatch
    ? `후보 A(${candidateA.industry})와 후보 B(${candidateB.industry})는 업종이 달라 단순 점포 수 비교가 불가합니다. 아래 경고와 설비·인허가 차이를 확인하세요.`
    : diffs.fixedCostDiff === 0
      ? `두 후보의 매달 고정비는 ${evalA.monthlyFixedCost.toLocaleString()}만원으로 같고, 면적 차이는 ${formatSigned(diffs.areaPyeongDiff, '평')}입니다.`
      : diffs.fixedCostDiff > 0
        ? `후보 B가 매달 ${Math.abs(diffs.fixedCostDiff).toLocaleString()}만원 더 비싸고, 면적은 ${formatSigned(diffs.areaPyeongDiff, '평')} 차이납니다.`
        : `후보 A가 매달 ${Math.abs(diffs.fixedCostDiff).toLocaleString()}만원 더 비싸고, 면적은 ${formatSigned(-diffs.areaPyeongDiff, '평')} 차이납니다.`;

  return (
    <section
      aria-label="서비스 소개 및 현재 비교 요약"
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs"
    >
      <div className="grid grid-cols-1 gap-6 p-5 sm:p-7 lg:grid-cols-12 lg:items-center">
        {/* 왼쪽: 첫 사용자가 3초 만에 이해하는 서비스 정체성 & 3단계 사용법 */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-bold text-[#92400E]">
            <HelpCircle className="h-3.5 w-3.5" />
            이 앱은 무엇을 하나요? · 예비 창업자 가게 자리 비교 AI
          </div>

          <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[26px]">
            창업할 가게 자리 2곳,
            <br className="hidden sm:inline" /> 감으로 고르지 말고{' '}
            <span className="text-[#B45309]">한눈에 비교</span>하세요
          </h2>

          <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
            부동산 매물 조건(월세·면적·수리비), 주변 상권 공공데이터, 내가 적은 현장 메모를 한 화면에 모아{' '}
            <strong className="font-bold text-slate-900">
              어디가 내 기준에 맞는지, 계약 전 집주인에게 무엇을 꼭 물어봐야 하는지
            </strong>{' '}
            정리해 드립니다.
          </p>

          {/* 3단계 초간단 사용법 */}
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] font-extrabold text-[#92400E]">1단계</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800">
                내 예산·업종 조건 입력
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                또는 아래 1분 예시 클릭
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] font-extrabold text-[#92400E]">2단계</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800">
                후보 A·B 비용·지도 비교
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                초록(충족)·빨강(초과) 바로 확인
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2.5">
              <div className="text-[11px] font-extrabold text-[#92400E]">3단계</div>
              <div className="mt-0.5 text-xs font-bold text-slate-800">
                집주인 질문 체크 · PDF
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                현장 재방문·창업상담 바로 활용
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onJumpToCompare}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0B0F17] px-4 text-xs font-bold text-white transition hover:bg-slate-800 sm:text-sm"
            >
              지금 비교 결과 바로 보기
              <ArrowRight className="h-4 w-4 text-amber-300" />
            </button>
            <button
              type="button"
              onClick={onStartCustomInput}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 transition hover:bg-slate-50 sm:text-sm"
            >
              <Pencil className="h-3.5 w-3.5" />
              내가 알아본 매물 직접 입력하기
            </button>
          </div>
        </div>

        {/* 오른쪽: 첫 화면에서 바로 보이는 '지금 비교 중인 2곳' 라이브 요약 카드 */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 lg:col-span-5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>지금 비교 중인 가게 자리 2곳</span>
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              실시간 연동 중
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            {/* 후보 A 미니 카드 */}
            <div className="rounded-xl border border-blue-200/80 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-blue-600 text-[11px] font-bold text-white">
                    A
                  </span>
                  <span className="truncate text-sm font-bold text-slate-900">
                    {candidateA.name}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {candidateA.industry}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-slate-600">
                <span>
                  매달 <strong className="text-slate-900">{evalA.monthlyFixedCost}만원</strong> ·{' '}
                  <strong className="text-slate-900">{candidateA.areaPyeong}평</strong> ·{' '}
                  {candidateA.floor}
                </span>
                <span className="font-bold text-emerald-700">
                  충족 {evalA.summaryCounts.pass}
                  {evalA.summaryCounts.fail > 0 && (
                    <span className="ml-1 text-rose-600">· 초과 {evalA.summaryCounts.fail}</span>
                  )}
                </span>
              </div>
            </div>

            {/* 후보 B 미니 카드 */}
            <div className="rounded-xl border border-emerald-200/80 bg-white p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-emerald-600 text-[11px] font-bold text-white">
                    B
                  </span>
                  <span className="truncate text-sm font-bold text-slate-900">
                    {candidateB.name}
                  </span>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {candidateB.industry}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums text-slate-600">
                <span>
                  매달 <strong className="text-slate-900">{evalB.monthlyFixedCost}만원</strong> ·{' '}
                  <strong className="text-slate-900">{candidateB.areaPyeong}평</strong> ·{' '}
                  {candidateB.floor}
                </span>
                <span className="font-bold text-emerald-700">
                  충족 {evalB.summaryCounts.pass}
                  {evalB.summaryCounts.fail > 0 && (
                    <span className="ml-1 text-rose-600">· 초과 {evalB.summaryCounts.fail}</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 1줄 핵심 결론 */}
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs leading-relaxed text-[#78350F]">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B45309]" />
            <span>
              <strong>한눈에 결론:</strong> {headlineInsight}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
