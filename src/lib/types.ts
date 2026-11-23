export const BUSINESS_CATEGORIES = [
  '카페',
  '소형 음식점',
  '소매점',
  '생활서비스',
  '교육·학원',
  '의료·건강',
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export type FloorOption = '지하1층' | '1층' | '2층' | '3층 이상';

export const FLOOR_OPTIONS: FloorOption[] = ['1층', '2층', '3층 이상', '지하1층'];

export interface StoreRecord {
  id: string;
  name: string;
  largeCategory: string;
  midCategory: string;
  smallCategory: string;
  standardCategory: BusinessCategory;
  ksicName: string;
  sido: string;
  sigungu: string;
  adminDong: string;
  roadAddress: string;
  lng: number;
  lat: number;
}

export interface PopulationRecord {
  adminCode: string;
  sido: string;
  sigungu: string;
  adminDong: string;
  key: string; // e.g. "경상북도 영주시 가흥1동"
  referenceDate: string;
  totalPopulation: number;
  households: number;
  age20Count: number;
  age30Count: number;
  age40Count: number;
  age50PlusCount: number;
  age20Pct: number;
  age30Pct: number;
  age40Pct: number;
  age50PlusPct: number;
}

export interface UserCriteria {
  targetIndustry: BusinessCategory;
  maxDeposit: number; // 만원
  maxMonthlyRent: number; // 만원
  minAreaPyeong: number; // 평
  requireFirstFloor: boolean;
  radiusMeters: 300 | 500;
}

export interface CandidateProperty {
  slot: 'A' | 'B';
  name: string;
  address: string;
  adminDongKey: string;
  lat: number;
  lng: number;
  industry: BusinessCategory;
  deposit: number; // 만원
  monthlyRent: number; // 만원
  maintenanceFee: number; // 만원
  areaPyeong: number; // 평
  floor: FloorOption;
  keyMoney: number; // 권리금 (만원)
  repairCost: number; // 예상 수리비 (만원)
  fieldNotes: string;
}

export type StatusLevel = 'pass' | 'warn' | 'fail';

export interface CriterionCheck {
  key: string;
  label: string;
  status: StatusLevel;
  statusLabel: '충족' | '주의' | '초과';
  actualText: string;
  targetText: string;
  detail: string;
}

export interface NearbyStore extends StoreRecord {
  distanceM: number;
}

export interface CommercialStats {
  radiusMeters: 300 | 500;
  totalStores: number;
  sameIndustryCount: number;
  sameIndustryDensityPct: number;
  categoryCounts: Record<BusinessCategory, number>;
  nearbyStores: NearbyStore[];
}

export interface CandidateEvaluation {
  slot: 'A' | 'B';
  monthlyFixedCost: number; // 월세 + 관리비 (만원)
  depositConvertedMonthly: number; // 보증금 연 5% 환산 월 참고치 (만원)
  totalEffectiveMonthlyRef: number; // 월 고정비 + 보증금 환산 참고치 (만원)
  costPerPyeong: number; // 평당 월 고정비 (만원/평)
  initialOutlayTotal: number; // 보증금 + 권리금 + 예상 수리비 (만원)
  areaSqm: number;
  checks: CriterionCheck[];
  summaryCounts: {
    pass: number;
    warn: number;
    fail: number;
  };
  commercial: CommercialStats;
  population: PopulationRecord | null;
  densityStatus: StatusLevel;
  densityLabel: string;
}

export interface ComparisonDiffs {
  fixedCostDiff: number; // B - A (만원)
  depositDiff: number; // B - A (만원)
  areaPyeongDiff: number; // B - A (평)
  costPerPyeongDiff: number; // B - A (만원/평)
  initialOutlayDiff: number; // B - A (만원)
  totalStoresDiff: number; // B - A (개)
  sameIndustryDiff: number; // B - A (개)
  densityPctDiff: number; // B - A (%p)
}

export interface ComparisonSummary {
  evalA: CandidateEvaluation;
  evalB: CandidateEvaluation;
  industryMismatch: boolean;
  industryMismatchMessage: string | null;
  diffs: ComparisonDiffs;
}

export interface LandlordChecklistItem {
  target: '공통' | '후보 A' | '후보 B';
  category: '임대조건' | '시설·수리' | '상권·운영';
  question: string;
  reason: string;
}

export interface AiAnalysisResult {
  tradeoff_summary: string[];
  candidate_a_risks: string[];
  candidate_b_risks: string[];
  landlord_checklist: LandlordChecklistItem[];
  guardrail_notice: string;
}

export interface AiAnalyzeResponse {
  mode: 'LIVE GEMINI AI' | 'SAFE FALLBACK';
  model: string;
  fallbackReason?: string;
  generatedAt: string;
  analysis: AiAnalysisResult;
}

export interface PresetScenario {
  id: string;
  shortLabel: string;
  title: string;
  subtitle: string;
  demoPoint: string;
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
}

export interface DataSourceMeta {
  commercialSource: string;
  commercialReferenceDate: string;
  populationSource: string;
  populationReferenceDate: string;
  totalCommercialRows: number;
  totalAdminDongs: number;
}
