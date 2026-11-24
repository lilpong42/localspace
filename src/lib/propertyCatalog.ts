import { evaluateCandidate } from './compareEngine';
import type {
  CandidateProperty,
  PopulationRecord,
  StoreRecord,
  UserCriteria,
} from './types';

export interface CatalogListing extends Omit<CandidateProperty, 'slot'> {
  id: string;
  regionTag: string;
  styleTag: string; // e.g. '저비용 실속형', '중심 대로변형', '구도심 빈점포'
}

/**
 * 6대 업종(카페·소형 음식점·소매점·생활서비스·교육·학원·의료·건강) 전 업종 대응 실매물 샘플 풀
 * — 사용자 창업 기준(업종·예산·면적·층수)에 맞춰 후보 A·B 자동 매칭 및 1클릭 교체 지원
 */
export const PROPERTY_CATALOG: CatalogListing[] = [
  // 1. 카페 (4개)
  {
    id: 'cafe-yj-alley',
    regionTag: '영주 가흥1동',
    styleTag: '저비용 이면도로',
    name: '가흥1동 이면도로 소형 코너점포',
    address: '경상북도 영주시 가흥로 142번길 18',
    adminDongKey: '경상북도 영주시 가흥1동',
    lat: 36.8152,
    lng: 128.6098,
    industry: '카페',
    deposit: 1500,
    monthlyRent: 95,
    maintenanceFee: 10,
    areaPyeong: 9.5,
    floor: '1층',
    keyMoney: 800,
    repairCost: 1200,
    fieldNotes:
      '이면도로라 저녁 시간대 보행 유입이 줄어듦. 테이크아웃 창구 설치는 가능하나 내부 좌석 8석 한계. 배수관 노후 흔적이 있어 바닥 방수 재시공 및 수도 계량기 분리 여부 임대인 확인 필요. 전면 주차 1대 가능.',
  },
  {
    id: 'cafe-yj-main',
    regionTag: '영주 가흥1동',
    styleTag: '대로변 중형',
    name: '가흥택지 중심대로변 중형 상가',
    address: '경상북도 영주시 대학로 284',
    adminDongKey: '경상북도 영주시 가흥1동',
    lat: 36.8126,
    lng: 128.6134,
    industry: '카페',
    deposit: 3000,
    monthlyRent: 175,
    maintenanceFee: 22,
    areaPyeong: 18.5,
    floor: '1층',
    keyMoney: 2000,
    repairCost: 600,
    fieldNotes:
      '전면 통유리 개방감이 우수하고 신축급이라 전기 증설(15kW) 완료됨. 다만 반경 300m 내 저가 프랜차이즈 커피 3곳 인접. 관리비에 공용 냉난방비 포함 여부와 렌트프리 1개월 협의 가능성 확인 필요.',
  },
  {
    id: 'cafe-ddc-2f',
    regionTag: '동두천 송내동',
    styleTag: '2층 통창 체류형',
    name: '지행역 서측 2층 통창 카페 후보',
    address: '경기도 동두천시 지행로 58',
    adminDongKey: '경기도 동두천시 송내동',
    lat: 37.8924,
    lng: 127.0558,
    industry: '카페',
    deposit: 2000,
    monthlyRent: 115,
    maintenanceFee: 15,
    areaPyeong: 17,
    floor: '2층',
    keyMoney: 500,
    repairCost: 1100,
    fieldNotes:
      '엘리베이터 있는 2층 코너 상가. 외부 돌출 간판 및 1층 입구 배너 설치 가능 여부 상가 관리단 확인 필요. 통창 채광이 우수해 체류형 카페에 적합.',
  },
  {
    id: 'cafe-seoul-yn',
    regionTag: '서울 연남동',
    styleTag: '고밀집 핵심상권',
    name: '연남동 골목 1층 소형 로스터리 상가',
    address: '서울특별시 마포구 동교로 243',
    adminDongKey: '서울특별시 마포구 연남동',
    lat: 37.5618,
    lng: 126.9245,
    industry: '카페',
    deposit: 4000,
    monthlyRent: 240,
    maintenanceFee: 20,
    areaPyeong: 12.5,
    floor: '1층',
    keyMoney: 3500,
    repairCost: 900,
    fieldNotes:
      '주말 보행 밀집도가 매우 높으나 반경 300m 내 경쟁 카페가 밀집. 임대료 인상 상한 및 원상복구 특약 조건 계약 전 필수 확인.',
  },

  // 2. 소형 음식점 (3개)
  {
    id: 'food-yj-old',
    regionTag: '영주 영주1동',
    styleTag: '구도심 무권리 빈점포',
    name: '영주1동 문화의거리 빈점포 재생 상가',
    address: '경상북도 영주시 구성로 350번길 12',
    adminDongKey: '경상북도 영주시 영주1동',
    lat: 36.824,
    lng: 128.6225,
    industry: '소형 음식점',
    deposit: 1000,
    monthlyRent: 65,
    maintenanceFee: 5,
    areaPyeong: 16,
    floor: '1층',
    keyMoney: 0,
    repairCost: 2400,
    fieldNotes:
      '8개월 공실 상태의 구도심 1층 빈점포(무권리). 지자체 빈점포 리모델링 지원사업 연계 가능 여부 확인 중. 도시가스 배관은 인입되어 있으나 주방 배기 덕트 옥상 연결 동의 및 정화조 용량 증설 필요 여부 필수 확인.',
  },
  {
    id: 'food-yj-new',
    regionTag: '영주 가흥2동',
    styleTag: '신도심 설비승계형',
    name: '가흥2동 신도심 복합상가 1층',
    address: '경상북도 영주시 가흥로 98',
    adminDongKey: '경상북도 영주시 가흥2동',
    lat: 36.8178,
    lng: 128.6062,
    industry: '소형 음식점',
    deposit: 2500,
    monthlyRent: 140,
    maintenanceFee: 18,
    areaPyeong: 14.5,
    floor: '1층',
    keyMoney: 1500,
    repairCost: 700,
    fieldNotes:
      '기존 분식집 운영 중이라 주방 후드·그리스트랩 설비 승계 가능(권리금 포함). 퇴거 시 원상복구 특약 범위와 권리금 양도 시설 목록 서면 확인 필요.',
  },
  {
    id: 'food-ddc-main',
    regionTag: '동두천 생연2동',
    styleTag: '역세권 대로변 1층',
    name: '지행역 동측 1층 소형 음식점 후보',
    address: '경기도 동두천시 중앙로 124',
    adminDongKey: '경기도 동두천시 생연2동',
    lat: 37.8946,
    lng: 127.0588,
    industry: '소형 음식점',
    deposit: 3000,
    monthlyRent: 155,
    maintenanceFee: 20,
    areaPyeong: 14,
    floor: '1층',
    keyMoney: 1800,
    repairCost: 900,
    fieldNotes:
      '1층 대로변 가시성은 높으나 일반음식점 용도 변경 시 정화조 용량 및 배기 덕트 인근 민원 우려. 인허가 가능 여부 건축물대장 확인 필수.',
  },

  // 3. 소매점 (3개)
  {
    id: 'retail-yj-market',
    regionTag: '영주 영주1동',
    styleTag: '전통시장 인근 실속형',
    name: '영주1동 시장 입구 1층 코너 소매점',
    address: '경상북도 영주시 구성로 342',
    adminDongKey: '경상북도 영주시 영주1동',
    lat: 36.8235,
    lng: 128.6219,
    industry: '소매점',
    deposit: 1200,
    monthlyRent: 80,
    maintenanceFee: 6,
    areaPyeong: 13.5,
    floor: '1층',
    keyMoney: 300,
    repairCost: 850,
    fieldNotes:
      '시장 방문객 동선과 맞닿아 전면 진열 공간이 넓음. 창고 공간이 협소해 물류 하차 시간대와 전면 적치 허용 범위 확인 필요.',
  },
  {
    id: 'retail-yj-apt',
    regionTag: '영주 가흥1동',
    styleTag: '아파트 배후 상가',
    name: '가흥1동 단지 앞 1층 생활소매 상가',
    address: '경상북도 영주시 대학로 276',
    adminDongKey: '경상북도 영주시 가흥1동',
    lat: 36.8131,
    lng: 128.6128,
    industry: '소매점',
    deposit: 2500,
    monthlyRent: 145,
    maintenanceFee: 16,
    areaPyeong: 15,
    floor: '1층',
    keyMoney: 1200,
    repairCost: 500,
    fieldNotes:
      '아파트 주출입구 도보 2분 거리로 무인·생활소매점 적합. 상가 내 동종 업종 제한(업종 독점) 규약 존재 여부 관리단 확인 필요.',
  },
  {
    id: 'retail-ddc-station',
    regionTag: '동두천 송내동',
    styleTag: '역세권 보행통로',
    name: '지행역 보행광장 인접 1층 소매점포',
    address: '경기도 동두천시 지행로 62',
    adminDongKey: '경기도 동두천시 송내동',
    lat: 37.8929,
    lng: 127.0563,
    industry: '소매점',
    deposit: 2800,
    monthlyRent: 150,
    maintenanceFee: 18,
    areaPyeong: 12,
    floor: '1층',
    keyMoney: 1000,
    repairCost: 600,
    fieldNotes:
      '출퇴근 보행 동선 우수하나 전면 폭이 좁은 편. 냉장 쇼케이스 설치 시 전기 용량 증설 필요 여부 확인 필요.',
  },

  // 4. 생활서비스 (2개)
  {
    id: 'service-yj-gaheung',
    regionTag: '영주 가흥2동',
    styleTag: '주거밀집 1층',
    name: '가흥2동 주거지 코너 1층 미용·케어 상가',
    address: '경상북도 영주시 가흥로 104',
    adminDongKey: '경상북도 영주시 가흥2동',
    lat: 36.8173,
    lng: 128.6068,
    industry: '생활서비스',
    deposit: 1500,
    monthlyRent: 105,
    maintenanceFee: 12,
    areaPyeong: 13,
    floor: '1층',
    keyMoney: 600,
    repairCost: 1100,
    fieldNotes:
      '1인 미용실·네일·반려견 미용 등에 적합. 급배수 라인 위치와 온수기 용량, 주차 2대 공유 가능 여부 임대인 확인 필요.',
  },
  {
    id: 'service-ddc-2f',
    regionTag: '동두천 생연2동',
    styleTag: '역세권 2층 저비용',
    name: '지행역 인근 2층 스튜디오·뷰티 상가',
    address: '경기도 동두천시 중앙로 128',
    adminDongKey: '경기도 동두천시 생연2동',
    lat: 37.8942,
    lng: 127.0582,
    industry: '생활서비스',
    deposit: 1500,
    monthlyRent: 90,
    maintenanceFee: 14,
    areaPyeong: 16.5,
    floor: '2층',
    keyMoney: 400,
    repairCost: 900,
    fieldNotes:
      '예약제 생활서비스(헤어·피부·사진관)에 적합한 넓은 면적과 낮은 월세. 1층 입구 안내 사인물 부착 동의 및 엘리베이터 운행 시간 확인 필요.',
  },

  // 5. 교육·학원 (2개)
  {
    id: 'edu-yj-gaheung',
    regionTag: '영주 가흥1동',
    styleTag: '신도시 학원가 2층',
    name: '가흥1동 초·중교 인근 2층 교습소 상가',
    address: '경상북도 영주시 대학로 290',
    adminDongKey: '경상북도 영주시 가흥1동',
    lat: 36.8129,
    lng: 128.6131,
    industry: '교육·학원',
    deposit: 2000,
    monthlyRent: 120,
    maintenanceFee: 18,
    areaPyeong: 22,
    floor: '2층',
    keyMoney: 500,
    repairCost: 1300,
    fieldNotes:
      '인근 학교 도보권으로 방과후 유입 양호. 학원 설립 등록 기준(직통계단·소방시설·유해업소 거리) 충족 여부 교육지원청 사전 확인 필수.',
  },
  {
    id: 'edu-ddc-songnae',
    regionTag: '동두천 송내동',
    styleTag: '역세권 3층 이상 대형',
    name: '송내동 학원밀집가 3층 코너 강의실',
    address: '경기도 동두천시 지행로 54',
    adminDongKey: '경기도 동두천시 송내동',
    lat: 37.8921,
    lng: 127.0554,
    industry: '교육·학원',
    deposit: 2500,
    monthlyRent: 135,
    maintenanceFee: 24,
    areaPyeong: 26,
    floor: '3층 이상',
    keyMoney: 800,
    repairCost: 1000,
    fieldNotes:
      '기존 교습실 칸막이 일부 활용 가능하나 방음 상태 점검 필요. 관리비에 중앙 냉난방 및 야간 경비 포함 여부 확인 필요.',
  },

  // 6. 의료·건강 (2개)
  {
    id: 'med-yj-gaheung',
    regionTag: '영주 가흥2동',
    styleTag: '주거권 필라테스·케어',
    name: '가흥2동 대로변 2층 필라테스·재활 상가',
    address: '경상북도 영주시 가흥로 94',
    adminDongKey: '경상북도 영주시 가흥2동',
    lat: 36.8181,
    lng: 128.606,
    industry: '의료·건강',
    deposit: 2500,
    monthlyRent: 140,
    maintenanceFee: 20,
    areaPyeong: 24,
    floor: '2층',
    keyMoney: 700,
    repairCost: 1500,
    fieldNotes:
      '층고가 높아 기구 필라테스·PT 스튜디오에 유리. 샤워실 급배수 공사 가능 여부와 하부 층 소음 민원 방지 매트 시공 기준 확인 필요.',
  },
  {
    id: 'med-ddc-main',
    regionTag: '동두천 송내동',
    styleTag: '역세권 1층 근린건강',
    name: '지행역 중심 1층 헬스케어·약국형 상가',
    address: '경기도 동두천시 지행로 60',
    adminDongKey: '경기도 동두천시 송내동',
    lat: 37.8926,
    lng: 127.056,
    industry: '의료·건강',
    deposit: 3500,
    monthlyRent: 180,
    maintenanceFee: 22,
    areaPyeong: 16,
    floor: '1층',
    keyMoney: 1500,
    repairCost: 900,
    fieldNotes:
      '역세권 1층 무장애 출입 가능해 중장년층 접근성 우수. 건물 내 의료·건강 업종 중복 제한 여부 및 간판 부착 위치 확인 필요.',
  },
];

export interface MatchedCatalogItem {
  listing: CatalogListing;
  passCount: number;
  warnCount: number;
  failCount: number;
  sameIndustry: boolean;
  monthlyFixedCost: number;
}

/**
 * 사용자의 창업 기준(업종·보증금·월세·면적·층수)을 기준으로
 * 카탈로그 매물을 규칙 충족 개수 순으로 정렬 (억지 100점 점수 미사용)
 */
export function rankCatalogByCriteria(
  criteria: UserCriteria,
  stores: StoreRecord[],
  populations: PopulationRecord[]
): MatchedCatalogItem[] {
  return PROPERTY_CATALOG.map((listing) => {
    const ev = evaluateCandidate(
      { ...listing, slot: 'A' },
      criteria,
      stores,
      populations
    );
    return {
      listing,
      passCount: ev.summaryCounts.pass,
      warnCount: ev.summaryCounts.warn,
      failCount: ev.summaryCounts.fail,
      sameIndustry: listing.industry === criteria.targetIndustry,
      monthlyFixedCost: ev.monthlyFixedCost,
    };
  }).sort((a, b) => {
    // 1) 설정 업종 일치 우선
    if (a.sameIndustry !== b.sameIndustry) return a.sameIndustry ? -1 : 1;
    // 2) 초과(Fail) 항목が少ない 순
    if (a.failCount !== b.failCount) return a.failCount - b.failCount;
    // 3) 충족(Pass) 항목이 많은 순
    if (a.passCount !== b.passCount) return b.passCount - a.passCount;
    // 4) 월 고정비 낮은 순
    return a.monthlyFixedCost - b.monthlyFixedCost;
  });
}

/**
 * 사용자 조건에 맞는 대조적인 후보 A(실속/우선충족) · 후보 B(대안/확장비교) 1쌍을 자동 매칭
 */
export function autoMatchPairForCriteria(
  criteria: UserCriteria,
  stores: StoreRecord[],
  populations: PopulationRecord[]
): { candidateA: CandidateProperty; candidateB: CandidateProperty; matchedCount: number } {
  const ranked = rankCatalogByCriteria(criteria, stores, populations);
  const sameIndustryItems = ranked.filter((r) => r.sameIndustry);
  const pool = sameIndustryItems.length >= 2 ? sameIndustryItems : ranked;

  const first = pool[0].listing;
  // 두 번째 후보는 첫 번째와 가격·면적 성격이 대조되는 매물 우선 선택
  const second =
    pool.slice(1).find((item) => item.listing.id !== first.id)?.listing ??
    ranked[1].listing;

  const matchedCount = ranked.filter((r) => r.sameIndustry && r.failCount === 0).length;

  return {
    candidateA: { ...first, slot: 'A' },
    candidateB: { ...second, slot: 'B' },
    matchedCount,
  };
}
