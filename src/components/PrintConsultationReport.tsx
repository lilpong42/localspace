'use client';

import {
  type ChecklistProgressMap,
  getChecklistItemKey,
} from '@/components/AiVerificationPanel';
import { HannyangEmblem } from '@/components/HannyangEmblem';
import { formatSigned } from '@/lib/compareEngine';
import type {
  AiAnalyzeResponse,
  CandidateProperty,
  ComparisonSummary,
  DataSourceMeta,
  UserCriteria,
} from '@/lib/types';

interface PrintConsultationReportProps {
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  aiResponse: AiAnalyzeResponse | null;
  checklistProgress: ChecklistProgressMap;
  meta: DataSourceMeta;
  printedAt: string;
}

export function PrintConsultationReport({
  criteria,
  candidateA,
  candidateB,
  comparison,
  aiResponse,
  checklistProgress,
  meta,
  printedAt,
}: PrintConsultationReportProps) {
  const { evalA, evalB, diffs, industryMismatch, industryMismatchMessage } =
    comparison;
  const analysis = aiResponse?.analysis ?? null;
  const printDate =
    printedAt || aiResponse?.generatedAt?.slice(0, 10) || meta.commercialReferenceDate;

  return (
    <div className="print-only hidden bg-white text-slate-900">
      {/* 리포트 헤더 */}
      <header className="border-b-2 border-[#0B0F17] pb-3">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2.5">
            <HannyangEmblem size={34} />
            <div>
              <div className="text-[10px] font-semibold tracking-wider text-[#92400E]">
                HANNYANG LOCALSPACE CONSULTATION REPORT · 제1회 동양AI빅데이터융합 아이디어 공모전
              </div>
              <h1 className="mt-0.5 text-xl font-bold text-slate-900">
                한냥 LocalSpace 창업 공간 비교 상담 리포트
              </h1>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-600">
            <div>출력일자: {printDate}</div>
            <div>분석 엔진: {aiResponse?.mode ?? 'SAFE FALLBACK'}</div>
          </div>
        </div>

        {/* 필수 데이터 출처 및 가드레일 고지 */}
        <div className="mt-2.5 rounded border border-slate-300 bg-slate-50 px-3 py-2 text-[10px] leading-relaxed text-slate-700">
          <div>
            <strong>[데이터 출처·기준시점]</strong> 상권: {meta.commercialSource} (
            {meta.commercialReferenceDate}) / 인구: {meta.populationSource} (
            {meta.populationReferenceDate})
          </div>
          <div>
            <strong>[조회 범위 및 해석 주의]</strong> 상권 = 입력 주소 반경({criteria.radiusMeters}m) 기준 / 인구 = 선택 행정구역 단위 거주 배후인구 참고자료 (실제 유동인구 아님). 본 리포트는 근거 없는 예상 매출액·창업 성공률 예측이나 1등/2등 순위를 제공하지 않습니다.
          </div>
        </div>

        {industryMismatch && industryMismatchMessage && (
          <div className="mt-2 rounded border border-amber-400 bg-amber-50 px-3 py-1.5 text-[10.5px] font-semibold text-amber-950">
            [비교 오류 방지 경고] {industryMismatchMessage} (후보 A: {candidateA.industry} vs 후보 B: {candidateB.industry})
          </div>
        )}
      </header>

      {/* 1. 사용자 설정 기준 */}
      <section className="mt-4 print-break-avoid">
        <h2 className="border-l-4 border-slate-900 pl-2 text-xs font-bold text-slate-900">
          1. 사용자 설정 창업 기준
        </h2>
        <div className="mt-2 grid grid-cols-5 gap-2 rounded border border-slate-200 p-2.5 text-[10.5px]">
          <div>
            <div className="text-slate-500">희망 업종</div>
            <div className="font-bold">{criteria.targetIndustry}</div>
          </div>
          <div>
            <div className="text-slate-500">최대 보증금</div>
            <div className="font-bold">{criteria.maxDeposit.toLocaleString()}만원</div>
          </div>
          <div>
            <div className="text-slate-500">최대 월세</div>
            <div className="font-bold">{criteria.maxMonthlyRent.toLocaleString()}만원</div>
          </div>
          <div>
            <div className="text-slate-500">최소 전용면적</div>
            <div className="font-bold">{criteria.minAreaPyeong}평</div>
          </div>
          <div>
            <div className="text-slate-500">1층 조건 / 반경</div>
            <div className="font-bold">
              {criteria.requireFirstFloor ? '1층 필수' : '층수 무관'} · {criteria.radiusMeters}m
            </div>
          </div>
        </div>
      </section>

      {/* 2. 후보 A vs 후보 B 병렬 정량 비교표 */}
      <section className="mt-4 print-break-avoid">
        <h2 className="border-l-4 border-slate-900 pl-2 text-xs font-bold text-slate-900">
          2. 후보 A vs 후보 B 정량 조건 및 공공통계 비교표
        </h2>
        <table className="mt-2 w-full border-collapse border border-slate-300 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="w-[22%] border border-slate-300 px-2 py-1.5 text-left">비교 항목</th>
              <th className="w-[31%] border border-slate-300 px-2 py-1.5 text-left text-blue-900">
                후보 A · {candidateA.name}
              </th>
              <th className="w-[31%] border border-slate-300 px-2 py-1.5 text-left text-emerald-900">
                후보 B · {candidateB.name}
              </th>
              <th className="w-[16%] border border-slate-300 px-2 py-1.5 text-right">격차 (B − A)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">주소 / 행정동</td>
              <td className="border border-slate-300 px-2 py-1.5">{candidateA.address}</td>
              <td className="border border-slate-300 px-2 py-1.5">{candidateB.address}</td>
              <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">-</td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">업종 / 층수</td>
              <td className="border border-slate-300 px-2 py-1.5">
                {candidateA.industry} / {candidateA.floor}
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {candidateB.industry} / {candidateB.floor}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right">
                {industryMismatch ? '업종 상이' : '동일 업종'}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">보증금</td>
              <td className="border border-slate-300 px-2 py-1.5">
                {candidateA.deposit.toLocaleString()}만원
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {candidateB.deposit.toLocaleString()}만원
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold">
                {formatSigned(diffs.depositDiff, '만원')}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">월 고정비 (월세+관리비)</td>
              <td className="border border-slate-300 px-2 py-1.5">
                {evalA.monthlyFixedCost.toLocaleString()}만원 ({candidateA.monthlyRent}+{candidateA.maintenanceFee})
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {evalB.monthlyFixedCost.toLocaleString()}만원 ({candidateB.monthlyRent}+{candidateB.maintenanceFee})
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold">
                {formatSigned(diffs.fixedCostDiff, '만원')}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">전용면적 / 평당 고정비</td>
              <td className="border border-slate-300 px-2 py-1.5">
                {candidateA.areaPyeong}평 ({evalA.areaSqm}㎡) · {evalA.costPerPyeong}만원/평
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {candidateB.areaPyeong}평 ({evalB.areaSqm}㎡) · {evalB.costPerPyeong}만원/평
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold">
                {formatSigned(diffs.areaPyeongDiff, '평')}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">초기 투입 (보증+권리+수리)</td>
              <td className="border border-slate-300 px-2 py-1.5">
                {evalA.initialOutlayTotal.toLocaleString()}만원 (권리 {candidateA.keyMoney} / 수리 {candidateA.repairCost})
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {evalB.initialOutlayTotal.toLocaleString()}만원 (권리 {candidateB.keyMoney} / 수리 {candidateB.repairCost})
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right font-semibold">
                {formatSigned(diffs.initialOutlayDiff, '만원')}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">
                반경 {criteria.radiusMeters}m 상권 (전체 / 동종)
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                전체 {evalA.commercial.totalStores}개 / 동종 {evalA.commercial.sameIndustryCount}개 ({evalA.commercial.sameIndustryDensityPct}%)
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                전체 {evalB.commercial.totalStores}개 / 동종 {evalB.commercial.sameIndustryCount}개 ({evalB.commercial.sameIndustryDensityPct}%)
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right">
                {industryMismatch ? '비교 보류' : formatSigned(diffs.densityPctDiff, '%p')}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">
                행정동 거주 배후인구 (참고)
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {evalA.population
                  ? `${evalA.population.adminDong} ${evalA.population.totalPopulation.toLocaleString()}명 (20~30대 ${(evalA.population.age20Pct + evalA.population.age30Pct).toFixed(1)}%)`
                  : '-'}
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                {evalB.population
                  ? `${evalB.population.adminDong} ${evalB.population.totalPopulation.toLocaleString()}명 (20~30대 ${(evalB.population.age20Pct + evalB.population.age30Pct).toFixed(1)}%)`
                  : '-'}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">
                유동인구 아님
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 px-2 py-1.5 font-semibold">정량 판정 요약</td>
              <td className="border border-slate-300 px-2 py-1.5">
                충족 {evalA.summaryCounts.pass} / 주의 {evalA.summaryCounts.warn} / 초과 {evalA.summaryCounts.fail}
              </td>
              <td className="border border-slate-300 px-2 py-1.5">
                충족 {evalB.summaryCounts.pass} / 주의 {evalB.summaryCounts.warn} / 초과 {evalB.summaryCounts.fail}
              </td>
              <td className="border border-slate-300 px-2 py-1.5 text-right text-slate-500">
                개별 판정
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 3. 현장 방문 메모 */}
      <section className="mt-4 grid grid-cols-2 gap-3 print-break-avoid">
        <div className="rounded border border-slate-300 p-2.5">
          <div className="text-[10.5px] font-bold text-blue-900">
            후보 A 현장 방문 메모
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-700">
            {candidateA.fieldNotes || '기록된 현장 메모 없음'}
          </p>
        </div>
        <div className="rounded border border-slate-300 p-2.5">
          <div className="text-[10.5px] font-bold text-emerald-900">
            후보 B 현장 방문 메모
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-700">
            {candidateB.fieldNotes || '기록된 현장 메모 없음'}
          </p>
        </div>
      </section>

      {/* 4. AI 근거 요약 및 임대인 확인 체크리스트 */}
      {analysis && (
        <>
          <section className="mt-4 print-break-avoid">
            <h2 className="border-l-4 border-slate-900 pl-2 text-xs font-bold text-slate-900">
              3. 근거 기반 트레이드오프 요약 및 후보별 리스크
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[10px] leading-relaxed">
              {analysis.tradeoff_summary.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <div className="mt-2.5 grid grid-cols-2 gap-3 text-[10px]">
              <div className="rounded border border-slate-200 p-2">
                <div className="font-bold text-blue-900">후보 A 확인 필요 리스크</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {analysis.candidate_a_risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded border border-slate-200 p-2">
                <div className="font-bold text-emerald-900">후보 B 확인 필요 리스크</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {analysis.candidate_b_risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-4 print-break-avoid">
            <h2 className="border-l-4 border-slate-900 pl-2 text-xs font-bold text-slate-900">
              4. 현장 재방문 임대인·중개사 확인 체크리스트
            </h2>
            <table className="mt-2 w-full border-collapse border border-slate-300 text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="w-[7%] border border-slate-300 px-1.5 py-1 text-center">확인</th>
                  <th className="w-[15%] border border-slate-300 px-2 py-1 text-left">대상 · 영역</th>
                  <th className="w-[50%] border border-slate-300 px-2 py-1 text-left">확인 질문 및 근거</th>
                  <th className="w-[28%] border border-slate-300 px-2 py-1 text-left">현장 답변 메모</th>
                </tr>
              </thead>
              <tbody>
                {analysis.landlord_checklist.map((item, idx) => {
                  const key = getChecklistItemKey(idx, item.question);
                  const state = checklistProgress[key];
                  return (
                    <tr key={key}>
                      <td className="border border-slate-300 px-1.5 py-1.5 text-center font-bold">
                        {state?.checked ? '☑' : '☐'}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-semibold">
                        {item.target} / {item.category}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5">
                        <div className="font-semibold">{item.question}</div>
                        <div className="mt-0.5 text-[9px] text-slate-600">
                          근거: {item.reason}
                        </div>
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-700">
                        {state?.answerMemo || ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
