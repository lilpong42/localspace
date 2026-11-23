import { formatSigned, roundTo } from './compareEngine';
import type {
  AiAnalysisResult,
  CandidateProperty,
  ComparisonSummary,
  LandlordChecklistItem,
  UserCriteria,
} from './types';

interface AnalyzePayload {
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
}

function extractNoteChecklists(
  candidate: CandidateProperty,
  slotLabel: '후보 A' | '후보 B'
): LandlordChecklistItem[] {
  const note = candidate.fieldNotes || '';
  const items: LandlordChecklistItem[] = [];

  if (/배수|방수|누수|수도|계량기/.test(note)) {
    items.push({
      target: slotLabel,
      category: '시설·수리',
      question:
        '기존 배수관·바닥 방수 상태와 수도 계량기 단독 분리 여부를 확인하고, 노후 배관 보수 비용 부담 주체를 특약에 명시할 수 있나요?',
      reason: `${slotLabel} 현장 메모에 배수·방수·수도 관련 확인 사항이 기록되어 있어 계약 전 수선 책임 범위 확정이 필요합니다.`,
    });
  }

  if (/덕트|환기|정화조|가스|후드|그리스트랩|용도/.test(note)) {
    items.push({
      target: slotLabel,
      category: '시설·수리',
      question:
        '주방 배기 덕트 설치(건물 외벽·옥상 연결) 동의, 정화조 용량 및 일반·휴게음식점 영업신고 가능 여부를 건축물대장 기준으로 확인할 수 있나요?',
      reason: `${slotLabel} 현장 메모의 주방 설비·덕트·정화조·용도 관련 리스크는 인허가 불가 시 계약 이행에 직접 영향을 줍니다.`,
    });
  }

  if (/렌트프리|무상임대|관리비|냉난방/.test(note)) {
    items.push({
      target: slotLabel,
      category: '임대조건',
      question:
        '인테리어 공사 기간 렌트프리(무상임대) 적용 가능 기간과 월 관리비의 세부 항목(공용 냉난방·청소·수도 포함 여부)을 서면으로 받을 수 있나요?',
      reason: `${slotLabel} 월 관리비(${candidate.maintenanceFee}만원) 및 현장 메모의 렌트프리·관리비 내역 협의 필요성에 근거했습니다.`,
    });
  }

  if (/권리금|원상복구|승계/.test(note) || candidate.keyMoney > 0) {
    items.push({
      target: slotLabel,
      category: '임대조건',
      question:
        '권리금 양도 대상 시설 목록을 사진·명세서로 확정하고, 향후 퇴거 시 원상복구 범위(승계 시설 철거 여부)를 계약서 특약으로 명시할 수 있나요?',
      reason: `${slotLabel}에 권리금(${candidate.keyMoney.toLocaleString()}만원) 또는 원상복구·설비 승계 메모가 포함되어 있어 분쟁 예방이 필요합니다.`,
    });
  }

  if (/간판|배너|2층|엘리베이터|가시성/.test(note) || candidate.floor !== '1층') {
    items.push({
      target: slotLabel,
      category: '상권·운영',
      question:
        '외부 돌출 간판 및 1층 주출입구 안내 배너 설치에 대한 건물 관리단·임대인 동의 및 옥외광고물 신고 기준은 어떻게 되나요?',
      reason: `${slotLabel}은 ${candidate.floor} 입지이거나 현장 메모에 간판·가시성 확인 사항이 있어 고객 인지 동선 검증이 필요합니다.`,
    });
  }

  if (/공실|빈점포|지원사업|리모델링/.test(note)) {
    items.push({
      target: slotLabel,
      category: '임대조건',
      question:
        '장기 공실 기간 동안 체납된 공과금·관리비 정산 여부와 지자체 빈점포 리모델링 지원사업 신청 시 임대인 동의서(임대기간 유지 확약) 협조가 가능한가요?',
      reason: `${slotLabel} 현장 메모에 공실·빈점포 지원사업 연계 가능성이 언급되어 있어 사전 동의 확보가 핵심입니다.`,
    });
  }

  if (/프랜차이즈|저가|경쟁|이면도로|주차/.test(note)) {
    items.push({
      target: slotLabel,
      category: '상권·운영',
      question:
        '인근 동종 점포의 주력 가격대·영업시간대와 건물 전용 주차 대수 및 인근 공영주차장 이용 여건을 현장 재방문 시 함께 확인할 수 있나요?',
      reason: `${slotLabel} 현장 메모의 경쟁 환경·이면도로·주차 조건을 실제 운영 시간대 기준으로 검증할 필요가 있습니다.`,
    });
  }

  return items;
}

function buildCandidateRisks(
  candidate: CandidateProperty,
  evaluation: ComparisonSummary['evalA'],
  criteria: UserCriteria,
  slotLabel: '후보 A' | '후보 B'
): string[] {
  const risks: string[] = [];

  for (const check of evaluation.checks) {
    if (check.status === 'fail') {
      risks.push(`[${check.label} 초과/미달] ${check.detail}`);
    } else if (check.status === 'warn') {
      risks.push(`[${check.label} 주의] ${check.detail}`);
    }
  }

  if (candidate.repairCost >= 1500) {
    risks.push(
      `[초기 수리비 비중] 예상 수리비 ${candidate.repairCost.toLocaleString()}만원(초기 투입 총액 ${evaluation.initialOutlayTotal.toLocaleString()}만원 중 ${roundTo((candidate.repairCost / Math.max(evaluation.initialOutlayTotal, 1)) * 100, 1)}%)으로 추가 공사비 예비비 확보 필요`
    );
  }

  if (candidate.keyMoney >= 1500) {
    risks.push(
      `[권리금 회수 리스크] 권리금 ${candidate.keyMoney.toLocaleString()}만원이 포함되어 있어 시설 노후도 및 향후 회수 가능성을 별도 검증 필요`
    );
  }

  if (evaluation.population && evaluation.population.age50PlusPct >= 55) {
    risks.push(
      `[배후 연령 구조 참고] 선택 행정동(${evaluation.population.adminDong}) 거주인구 중 50대 이상 비중이 ${evaluation.population.age50PlusPct}%로 높아 타깃 고객층과 부합 여부 현장 확인 필요 (실제 유동인구 아님)`
    );
  }

  if (candidate.fieldNotes.trim().length > 0 && risks.length < 3) {
    const firstSentence = candidate.fieldNotes.split(/[.!?\n]/).find((s) => s.trim().length > 8);
    if (firstSentence) {
      risks.push(`[현장 메모 점검] "${firstSentence.trim()}" 항목의 실측·증빙 확인 필요`);
    }
  }

  if (risks.length === 0) {
    risks.push(
      `${slotLabel}은 설정한 기본 정량 기준을 충족하나, 계약 전 실제 공과금 내역과 시간대별 보행 흐름을 직접 재확인하는 것이 안전합니다.`
    );
  }

  return risks.slice(0, 4);
}

export function buildFallbackAnalysis(payload: AnalyzePayload): AiAnalysisResult {
  const { criteria, candidateA, candidateB, comparison } = payload;
  const { evalA, evalB, diffs, industryMismatch } = comparison;

  const tradeoffSummary: string[] = [];

  // 1. 비용 vs 면적 핵심 트레이드오프
  const fixedCostCompare =
    diffs.fixedCostDiff === 0
      ? `월 고정비(월세+관리비)는 두 후보 모두 ${evalA.monthlyFixedCost.toLocaleString()}만원으로 동일합니다.`
      : diffs.fixedCostDiff > 0
        ? `후보 B의 월 고정비(${evalB.monthlyFixedCost.toLocaleString()}만원)가 후보 A(${evalA.monthlyFixedCost.toLocaleString()}만원)보다 월 ${Math.abs(diffs.fixedCostDiff).toLocaleString()}만원 높습니다.`
        : `후보 A의 월 고정비(${evalA.monthlyFixedCost.toLocaleString()}만원)가 후보 B(${evalB.monthlyFixedCost.toLocaleString()}만원)보다 월 ${Math.abs(diffs.fixedCostDiff).toLocaleString()}만원 높습니다.`;

  const areaCompare =
    diffs.areaPyeongDiff === 0
      ? `전용면적은 두 후보 모두 ${candidateA.areaPyeong}평으로 같습니다.`
      : diffs.areaPyeongDiff > 0
        ? `대신 후보 B의 전용면적(${candidateB.areaPyeong}평)이 후보 A(${candidateA.areaPyeong}평)보다 ${Math.abs(diffs.areaPyeongDiff)}평 넓으며, 평당 월 고정비는 A ${evalA.costPerPyeong}만원 vs B ${evalB.costPerPyeong}만원(${formatSigned(diffs.costPerPyeongDiff, '만원/평')})입니다.`
        : `후보 A의 전용면적(${candidateA.areaPyeong}평)이 후보 B(${candidateB.areaPyeong}평)보다 ${Math.abs(diffs.areaPyeongDiff)}평 넓으며, 평당 월 고정비는 A ${evalA.costPerPyeong}만원 vs B ${evalB.costPerPyeong}만원(${formatSigned(diffs.costPerPyeongDiff, '만원/평')})입니다.`;

  tradeoffSummary.push(`${fixedCostCompare} ${areaCompare}`);

  // 2. 초기 투입 자금 구조 차이 (보증금 + 권리금 + 예상 수리비)
  tradeoffSummary.push(
    `초기 투입 합계(보증금+권리금+수리비)는 후보 A ${evalA.initialOutlayTotal.toLocaleString()}만원(수리비 ${candidateA.repairCost.toLocaleString()}만원·권리금 ${candidateA.keyMoney.toLocaleString()}만원) vs 후보 B ${evalB.initialOutlayTotal.toLocaleString()}만원(수리비 ${candidateB.repairCost.toLocaleString()}만원·권리금 ${candidateB.keyMoney.toLocaleString()}만원)으로 ${formatSigned(diffs.initialOutlayDiff, '만원')} 차이가 납니다.`
  );

  // 3. 상권·배후인구 비교 (업종 상이 여부 반영)
  if (industryMismatch) {
    tradeoffSummary.push(
      `[업종 상이 주의] 후보 A(${candidateA.industry})와 후보 B(${candidateB.industry})는 비교 업종이 다르므로 반경 ${criteria.radiusMeters}m 동종 점포 수(A ${evalA.commercial.sameIndustryCount}개 / ${evalA.commercial.sameIndustryDensityPct}% vs B ${evalB.commercial.sameIndustryCount}개 / ${evalB.commercial.sameIndustryDensityPct}%)를 단순 우열로 비교하면 안 되며, 업종별 설비·인허가 기준으로 분리 검토해야 합니다.`
    );
  } else {
    const popText =
      evalA.population && evalB.population
        ? evalA.population.key === evalB.population.key
          ? `두 후보 모두 동일 행정동(${evalA.population.adminDong}, 거주인구 ${evalA.population.totalPopulation.toLocaleString()}명 참고)에 속하므로 미시 입지(대로변 vs 이면도로)와 동선 차이가 핵심입니다.`
          : `행정동 거주 배후인구(참고치)는 후보 A ${evalA.population.adminDong} ${evalA.population.totalPopulation.toLocaleString()}명 vs 후보 B ${evalB.population.adminDong} ${evalB.population.totalPopulation.toLocaleString()}명입니다(실제 유동인구와 별개).`
        : '';
    tradeoffSummary.push(
      `반경 ${criteria.radiusMeters}m 내 전체 점포 수는 A ${evalA.commercial.totalStores}개 vs B ${evalB.commercial.totalStores}개이며, 동종(${candidateA.industry}) 밀집도는 A ${evalA.commercial.sameIndustryCount}개(${evalA.commercial.sameIndustryDensityPct}%) vs B ${evalB.commercial.sameIndustryCount}개(${evalB.commercial.sameIndustryDensityPct}%)입니다. ${popText}`.trim()
    );
  }

  // 후보별 리스크
  const candidateARisks = buildCandidateRisks(candidateA, evalA, criteria, '후보 A');
  const candidateBRisks = buildCandidateRisks(candidateB, evalB, criteria, '후보 B');

  // 임대인·중개사 현장 확인 체크리스트 구성
  const checklist: LandlordChecklistItem[] = [];

  if (industryMismatch) {
    checklist.push({
      target: '공통',
      category: '상권·운영',
      question:
        '후보 A와 후보 B의 업종이 다르므로, 최종 희망 업종을 먼저 확정한 뒤 각 매물의 건축물 용도·영업신고 가능 여부를 재대조할 수 있나요?',
      reason: `후보 A(${candidateA.industry})와 후보 B(${candidateB.industry}) 간 업종 상이 경고가 활성화되어 있습니다.`,
    });
  }

  checklist.push(...extractNoteChecklists(candidateA, '후보 A'));
  checklist.push(...extractNoteChecklists(candidateB, '후보 B'));

  // 공통 핵심 질문 보강
  checklist.push({
    target: '공통',
    category: '임대조건',
    question:
      '임대차 계약 갱신 시 임대료 인상 상한(상가임대차보호법 적용 여부), 환산보증금 기준, 그리고 전기·수도·가스 용량 현황을 계약 전 문서로 확인할 수 있나요?',
    reason: `두 후보의 월 고정비 격차(${formatSigned(diffs.fixedCostDiff, '만원')})와 보증금 조건을 장기 운영 관점에서 안전하게 확정하기 위해 필요합니다.`,
  });

  // 중복 질문 제거 및 최대 6개로 정선
  const deduped: LandlordChecklistItem[] = [];
  const seen = new Set<string>();
  for (const item of checklist) {
    const key = `${item.target}:${item.category}:${item.question.slice(0, 18)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
    if (deduped.length >= 6) break;
  }

  return {
    tradeoff_summary: tradeoffSummary,
    candidate_a_risks: candidateARisks,
    candidate_b_risks: candidateBRisks,
    landlord_checklist: deduped,
    guardrail_notice:
      '근거 없는 매출·수익·성공률 예측과 임의 총점 순위를 제외하고, 입력된 실매물 조건·현장 방문 메모·공공 상권(반경 기준) 및 거주 배후인구(행정동 기준)의 정량 차이만 정리했습니다.',
  };
}
