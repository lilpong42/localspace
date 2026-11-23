import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  type CandidateEvaluation,
  type CandidateProperty,
  type CommercialStats,
  type ComparisonSummary,
  type CriterionCheck,
  type NearbyStore,
  type PopulationRecord,
  type StatusLevel,
  type StoreRecord,
  type UserCriteria,
} from './types';

export const PYEONG_TO_SQM = 3.305785;
export const DEPOSIT_CONVERSION_ANNUAL_RATE = 0.05; // 보증금 월 환산 참고율 (연 5%)

export const INDUSTRY_MISMATCH_WARNING =
  '비교 업종이 서로 다릅니다. 단순 점포 수만으로 유불리를 판단하지 마세요';

export function pyeongToSqm(pyeong: number): number {
  return Math.round(pyeong * PYEONG_TO_SQM * 10) / 10;
}

export function sqmToPyeong(sqm: number): number {
  return Math.round((sqm / PYEONG_TO_SQM) * 10) / 10;
}

export function roundTo(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function haversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function computeCommercialStats(
  lat: number,
  lng: number,
  radiusMeters: 300 | 500,
  industry: BusinessCategory,
  stores: StoreRecord[]
): CommercialStats {
  const categoryCounts: Record<BusinessCategory, number> = {
    카페: 0,
    '소형 음식점': 0,
    소매점: 0,
    생활서비스: 0,
    '교육·학원': 0,
    '의료·건강': 0,
  };

  const nearbyStores: NearbyStore[] = [];

  for (const store of stores) {
    const distanceM = haversineDistanceMeters(lat, lng, store.lat, store.lng);
    if (distanceM <= radiusMeters) {
      categoryCounts[store.standardCategory] =
        (categoryCounts[store.standardCategory] ?? 0) + 1;
      nearbyStores.push({
        ...store,
        distanceM: Math.round(distanceM),
      });
    }
  }

  nearbyStores.sort((a, b) => a.distanceM - b.distanceM);

  const totalStores = nearbyStores.length;
  const sameIndustryCount = categoryCounts[industry] ?? 0;
  const sameIndustryDensityPct =
    totalStores > 0 ? roundTo((sameIndustryCount / totalStores) * 100, 1) : 0;

  return {
    radiusMeters,
    totalStores,
    sameIndustryCount,
    sameIndustryDensityPct,
    categoryCounts,
    nearbyStores,
  };
}

export function findPopulationRecord(
  adminDongKey: string,
  populations: PopulationRecord[]
): PopulationRecord | null {
  if (!adminDongKey) return null;
  const exact = populations.find((p) => p.key === adminDongKey);
  if (exact) return exact;
  return (
    populations.find(
      (p) =>
        adminDongKey.includes(p.adminDong) &&
        (adminDongKey.includes(p.sigungu) || adminDongKey.includes(p.sido))
    ) ?? null
  );
}

function statusToLabel(status: StatusLevel): '충족' | '주의' | '초과' {
  if (status === 'pass') return '충족';
  if (status === 'warn') return '주의';
  return '초과';
}

export function evaluateCandidate(
  candidate: CandidateProperty,
  criteria: UserCriteria,
  stores: StoreRecord[],
  populations: PopulationRecord[]
): CandidateEvaluation {
  const safeAreaPyeong = Math.max(candidate.areaPyeong, 0.5);
  const monthlyFixedCost = roundTo(candidate.monthlyRent + candidate.maintenanceFee, 1);
  const depositConvertedMonthly = roundTo(
    (candidate.deposit * DEPOSIT_CONVERSION_ANNUAL_RATE) / 12,
    1
  );
  const totalEffectiveMonthlyRef = roundTo(monthlyFixedCost + depositConvertedMonthly, 1);
  const costPerPyeong = roundTo(monthlyFixedCost / safeAreaPyeong, 2);
  const initialOutlayTotal = roundTo(
    candidate.deposit + candidate.keyMoney + candidate.repairCost,
    1
  );
  const areaSqm = pyeongToSqm(candidate.areaPyeong);

  const commercial = computeCommercialStats(
    candidate.lat,
    candidate.lng,
    criteria.radiusMeters,
    candidate.industry,
    stores
  );
  const population = findPopulationRecord(candidate.adminDongKey, populations);

  const checks: CriterionCheck[] = [];

  // 1. 보증금 기준
  let depositStatus: StatusLevel = 'pass';
  let depositDetail = `설정 상한 대비 ${roundTo(criteria.maxDeposit - candidate.deposit, 0).toLocaleString()}만원 여유`;
  if (candidate.deposit > criteria.maxDeposit * 1.15) {
    depositStatus = 'fail';
    depositDetail = `기준 상한을 ${roundTo(candidate.deposit - criteria.maxDeposit, 0).toLocaleString()}만원 초과`;
  } else if (candidate.deposit > criteria.maxDeposit) {
    depositStatus = 'warn';
    depositDetail = `기준 상한을 ${roundTo(candidate.deposit - criteria.maxDeposit, 0).toLocaleString()}만원 소폭 초과 (협의 필요)`;
  }
  checks.push({
    key: 'deposit',
    label: '보증금 한도',
    status: depositStatus,
    statusLabel: statusToLabel(depositStatus),
    actualText: `${candidate.deposit.toLocaleString()}만원`,
    targetText: `≤ ${criteria.maxDeposit.toLocaleString()}만원`,
    detail: depositDetail,
  });

  // 2. 월세 및 월 고정비 기준
  let rentStatus: StatusLevel = 'pass';
  let rentDetail = `월세 ${candidate.monthlyRent}만원 + 관리비 ${candidate.maintenanceFee}만원 (합계 ${monthlyFixedCost}만원)`;
  if (candidate.monthlyRent > criteria.maxMonthlyRent * 1.1) {
    rentStatus = 'fail';
    rentDetail = `월세가 기준(${criteria.maxMonthlyRent}만원)을 ${roundTo(candidate.monthlyRent - criteria.maxMonthlyRent, 1)}만원 초과 (관리비 포함 ${monthlyFixedCost}만원)`;
  } else if (
    candidate.monthlyRent > criteria.maxMonthlyRent ||
    monthlyFixedCost > criteria.maxMonthlyRent * 1.15
  ) {
    rentStatus = 'warn';
    rentDetail = `관리비 포함 월 고정비(${monthlyFixedCost}만원)가 월세 상한 대비 빠듯함`;
  }
  checks.push({
    key: 'monthlyRent',
    label: '월세·고정비',
    status: rentStatus,
    statusLabel: statusToLabel(rentStatus),
    actualText: `월 ${monthlyFixedCost.toLocaleString()}만원`,
    targetText: `월세 ≤ ${criteria.maxMonthlyRent.toLocaleString()}만원`,
    detail: rentDetail,
  });

  // 3. 최소 희망 면적
  let areaStatus: StatusLevel = 'pass';
  let areaDetail = `최소 희망 면적 대비 ${roundTo(candidate.areaPyeong - criteria.minAreaPyeong, 1)}평 여유`;
  if (candidate.areaPyeong < criteria.minAreaPyeong * 0.85) {
    areaStatus = 'fail';
    areaDetail = `최소 기준(${criteria.minAreaPyeong}평)보다 ${roundTo(criteria.minAreaPyeong - candidate.areaPyeong, 1)}평 부족 — 좌석·주방 동선 실측 필수`;
  } else if (candidate.areaPyeong < criteria.minAreaPyeong) {
    areaStatus = 'warn';
    areaDetail = `최소 기준보다 ${roundTo(criteria.minAreaPyeong - candidate.areaPyeong, 1)}평 소폭 미달`;
  }
  checks.push({
    key: 'area',
    label: '최소 전용면적',
    status: areaStatus,
    statusLabel: areaStatus === 'fail' ? '초과' : statusToLabel(areaStatus),
    actualText: `${candidate.areaPyeong}평 (${areaSqm}㎡)`,
    targetText: `≥ ${criteria.minAreaPyeong}평`,
    detail: areaDetail,
  });

  // 4. 층수 조건
  const floorStatus: StatusLevel =
    !criteria.requireFirstFloor || candidate.floor === '1층' ? 'pass' : 'fail';
  checks.push({
    key: 'floor',
    label: '층수 조건',
    status: floorStatus,
    statusLabel: statusToLabel(floorStatus),
    actualText: candidate.floor,
    targetText: criteria.requireFirstFloor ? '1층 필수' : '층수 무관',
    detail:
      floorStatus === 'pass'
        ? criteria.requireFirstFloor
          ? '1층 필수 조건 충족'
          : `${candidate.floor} (층수 제한 미설정 — 가시성·간판 규정 현장 확인 권장)`
        : `1층 필수 조건 미충족 (${candidate.floor} 매물)`,
  });

  // 5. 반경 내 동종 업종 밀집도
  let densityStatus: StatusLevel = 'pass';
  let densityLabel = '적정 분포';
  let densityDetail = `반경 ${criteria.radiusMeters}m 내 전체 ${commercial.totalStores}개 중 ${candidate.industry} ${commercial.sameIndustryCount}개 (${commercial.sameIndustryDensityPct}%)`;

  if (commercial.totalStores === 0) {
    densityStatus = 'warn';
    densityLabel = '샘플 미보유 구역';
    densityDetail = `현재 내장 샘플 상가 인덱스 범위 외 좌표입니다. 실제 공공데이터 CSV 추가 시 즉시 집계됩니다.`;
  } else if (commercial.sameIndustryDensityPct >= 34) {
    densityStatus = 'fail';
    densityLabel = '고밀집 경계';
    densityDetail = `동종 업종 비중 ${commercial.sameIndustryDensityPct}%로 높음 — 차별화·직접 경쟁 실사 필수`;
  } else if (commercial.sameIndustryDensityPct >= 26) {
    densityStatus = 'warn';
    densityLabel = '과밀 주의';
    densityDetail = `동종 업종 비중 ${commercial.sameIndustryDensityPct}% (26% 이상) — 유사 가격대 경쟁 점포 현장 확인 필요`;
  }

  checks.push({
    key: 'density',
    label: `동종 밀집도 (${criteria.radiusMeters}m)`,
    status: densityStatus,
    statusLabel: statusToLabel(densityStatus),
    actualText: `${commercial.sameIndustryCount}개 (${commercial.sameIndustryDensityPct}%)`,
    targetText: '참고 기준 < 26%',
    detail: densityDetail,
  });

  // 6. 희망 업종 정합성
  const industryMatchStatus: StatusLevel =
    candidate.industry === criteria.targetIndustry ? 'pass' : 'warn';
  checks.push({
    key: 'industry',
    label: '희망 업종 정합',
    status: industryMatchStatus,
    statusLabel: statusToLabel(industryMatchStatus),
    actualText: candidate.industry,
    targetText: criteria.targetIndustry,
    detail:
      industryMatchStatus === 'pass'
        ? `설정한 희망 업종(${criteria.targetIndustry})과 일치`
        : `설정 희망 업종(${criteria.targetIndustry})과 상이 — 인허가·설비 기준 별도 확인 필요`,
  });

  const summaryCounts = checks.reduce(
    (acc, check) => {
      acc[check.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 }
  );

  return {
    slot: candidate.slot,
    monthlyFixedCost,
    depositConvertedMonthly,
    totalEffectiveMonthlyRef,
    costPerPyeong,
    initialOutlayTotal,
    areaSqm,
    checks,
    summaryCounts,
    commercial,
    population,
    densityStatus,
    densityLabel,
  };
}

export function compareCandidates(
  candidateA: CandidateProperty,
  candidateB: CandidateProperty,
  criteria: UserCriteria,
  stores: StoreRecord[],
  populations: PopulationRecord[]
): ComparisonSummary {
  const evalA = evaluateCandidate(candidateA, criteria, stores, populations);
  const evalB = evaluateCandidate(candidateB, criteria, stores, populations);

  const industryMismatch = candidateA.industry !== candidateB.industry;

  return {
    evalA,
    evalB,
    industryMismatch,
    industryMismatchMessage: industryMismatch ? INDUSTRY_MISMATCH_WARNING : null,
    diffs: {
      fixedCostDiff: roundTo(evalB.monthlyFixedCost - evalA.monthlyFixedCost, 1),
      depositDiff: roundTo(candidateB.deposit - candidateA.deposit, 1),
      areaPyeongDiff: roundTo(candidateB.areaPyeong - candidateA.areaPyeong, 1),
      costPerPyeongDiff: roundTo(evalB.costPerPyeong - evalA.costPerPyeong, 2),
      initialOutlayDiff: roundTo(evalB.initialOutlayTotal - evalA.initialOutlayTotal, 1),
      totalStoresDiff: evalB.commercial.totalStores - evalA.commercial.totalStores,
      sameIndustryDiff:
        evalB.commercial.sameIndustryCount - evalA.commercial.sameIndustryCount,
      densityPctDiff: roundTo(
        evalB.commercial.sameIndustryDensityPct - evalA.commercial.sameIndustryDensityPct,
        1
      ),
    },
  };
}

export function formatSigned(value: number, unit: string): string {
  if (value === 0) return `동일 (0${unit})`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString()}${unit}`;
}

export function getCategoryRatioList(stats: CommercialStats): Array<{
  category: BusinessCategory;
  count: number;
  pct: number;
}> {
  return BUSINESS_CATEGORIES.map((category) => {
    const count = stats.categoryCounts[category] ?? 0;
    const pct = stats.totalStores > 0 ? roundTo((count / stats.totalStores) * 100, 1) : 0;
    return { category, count, pct };
  });
}
