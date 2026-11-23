import { NextResponse } from 'next/server';
import { computeCommercialStats } from '@/lib/compareEngine';
import { loadCommercialData } from '@/lib/dataLoader';
import {
  BUSINESS_CATEGORIES,
  type BusinessCategory,
  type StoreRecord,
} from '@/lib/types';

function mapSemasCategory(
  large: string,
  mid: string,
  small: string
): BusinessCategory {
  const joined = `${large} ${mid} ${small}`;
  if (/카페|커피|찻집|비알코올/.test(joined)) return '카페';
  if (/음식|한식|중식|일식|양식|분식|패스트푸드|식당/.test(joined)) {
    return '소형 음식점';
  }
  if (/소매|편의점|마트|슈퍼|잡화|의류|서점|꽃/.test(joined)) return '소매점';
  if (/교육|학원|교습|독서실/.test(joined)) return '교육·학원';
  if (/보건|의료|의원|병원|약국|치과|한의원/.test(joined)) return '의료·건강';
  return '생활서비스';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number.parseFloat(searchParams.get('lat') || '');
  const lng = Number.parseFloat(searchParams.get('lng') || '');
  const radiusParam = Number.parseInt(searchParams.get('radius') || '300', 10);
  const radius: 300 | 500 = radiusParam === 500 ? 500 : 300;
  const industryRaw = searchParams.get('industry') || '카페';
  const industry: BusinessCategory = (
    BUSINESS_CATEGORIES as readonly string[]
  ).includes(industryRaw)
    ? (industryRaw as BusinessCategory)
    : '카페';

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: '유효한 위도(lat)·경도(lng) 파라미터가 필요합니다.' },
      { status: 400 }
    );
  }

  // DATA_GO_KR_API_KEY 설정 시 소상공인시장진흥공단 반경 상가정보 실시간 OpenAPI 조회
  const dataGoKrKey = (process.env.DATA_GO_KR_API_KEY || '').trim();
  if (dataGoKrKey && !dataGoKrKey.startsWith('your_')) {
    try {
      const url = `https://apis.data.go.kr/B553077/api/open/sdsc2/storeListInRadius?serviceKey=${encodeURIComponent(
        dataGoKrKey
      )}&pageNo=1&numOfRows=500&radius=${radius}&cx=${lng}&cy=${lat}&type=json`;

      const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
      if (res.ok) {
        const json = (await res.json()) as {
          body?: {
            items?: Array<{
              bizesId?: string;
              bizesNm?: string;
              indsLclsNm?: string;
              indsMclsNm?: string;
              indsSclsNm?: string;
              ksicNm?: string;
              ctprvnNm?: string;
              signguNm?: string;
              adongNm?: string;
              rdnmAdr?: string;
              lon?: number | string;
              lat?: number | string;
            }>;
          };
        };

        const items = json.body?.items ?? [];
        if (items.length > 0) {
          const liveStores: StoreRecord[] = items
            .map((it): StoreRecord | null => {
              const sLat = Number.parseFloat(String(it.lat ?? ''));
              const sLng = Number.parseFloat(String(it.lon ?? ''));
              if (!Number.isFinite(sLat) || !Number.isFinite(sLng)) return null;
              const large = it.indsLclsNm || '기타';
              const mid = it.indsMclsNm || '기타';
              const small = it.indsSclsNm || '기타';
              return {
                id: it.bizesId || `${sLat}_${sLng}`,
                name: it.bizesNm || '상호 미상',
                largeCategory: large,
                midCategory: mid,
                smallCategory: small,
                standardCategory: mapSemasCategory(large, mid, small),
                ksicName: it.ksicNm || small,
                sido: it.ctprvnNm || '',
                sigungu: it.signguNm || '',
                adminDong: it.adongNm || '',
                roadAddress: it.rdnmAdr || '',
                lng: sLng,
                lat: sLat,
              };
            })
            .filter((x): x is StoreRecord => x !== null);

          const stats = computeCommercialStats(
            lat,
            lng,
            radius,
            industry,
            liveStores
          );

          return NextResponse.json({
            mode: 'LIVE DATA.GO.KR API',
            source: '소상공인시장진흥공단 상가(상권)정보 실시간 OpenAPI',
            stats,
          });
        }
      }
    } catch {
      // Fall through cleanly to local CSV index
    }
  }

  const localStores = loadCommercialData();
  const stats = computeCommercialStats(lat, lng, radius, industry, localStores);

  return NextResponse.json({
    mode: 'LOCAL CSV INDEX',
    source: '소상공인시장진흥공단 상가(상권)정보 CSV 구조 (로컬 인덱스)',
    stats,
  });
}
