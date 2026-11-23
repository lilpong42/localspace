import { NextResponse } from 'next/server';
import { QUICK_ADDRESS_OPTIONS } from '@/lib/presets';

interface GeocodeCandidate {
  address: string;
  adminDongKey: string;
  lat: number;
  lng: number;
  source: 'KAKAO LOCAL API' | 'OSM NOMINATIM' | 'LOCAL INDEX';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').trim();

  if (query.length < 2) {
    return NextResponse.json(
      { error: '검색어를 2자 이상 입력해 주세요.' },
      { status: 400 }
    );
  }

  // 1. 내장 시연 주소 매칭 우선 확인
  const lower = query.toLowerCase();
  const localMatches: GeocodeCandidate[] = QUICK_ADDRESS_OPTIONS.filter(
    (opt) =>
      opt.address.toLowerCase().includes(lower) ||
      opt.label.toLowerCase().includes(lower) ||
      opt.adminDongKey.toLowerCase().includes(lower)
  ).map((opt) => ({
    address: opt.address,
    adminDongKey: opt.adminDongKey,
    lat: opt.lat,
    lng: opt.lng,
    source: 'LOCAL INDEX',
  }));

  // 2. KAKAO_REST_API_KEY 설정 시 카카오 로컬 주소 검색 API 호출
  const kakaoKey = (process.env.KAKAO_REST_API_KEY || '').trim();
  if (kakaoKey && !kakaoKey.startsWith('your_')) {
    try {
      const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(
        query
      )}&size=5`;
      const res = await fetch(url, {
        headers: { Authorization: `KakaoAK ${kakaoKey}` },
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          documents?: Array<{
            address_name?: string;
            road_address?: {
              address_name?: string;
              region_1depth_name?: string;
              region_2depth_name?: string;
              region_3depth_name?: string;
            };
            address?: {
              address_name?: string;
              region_1depth_name?: string;
              region_2depth_name?: string;
              region_3depth_h_name?: string;
              region_3depth_name?: string;
            };
            x?: string;
            y?: string;
          }>;
        };

        const docs = (json.documents ?? [])
          .map((d): GeocodeCandidate | null => {
            const lat = Number.parseFloat(d.y ?? '');
            const lng = Number.parseFloat(d.x ?? '');
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            const addr =
              d.road_address?.address_name ||
              d.address?.address_name ||
              d.address_name ||
              query;
            const r1 =
              d.address?.region_1depth_name ||
              d.road_address?.region_1depth_name ||
              '';
            const r2 =
              d.address?.region_2depth_name ||
              d.road_address?.region_2depth_name ||
              '';
            const r3 =
              d.address?.region_3depth_h_name ||
              d.address?.region_3depth_name ||
              d.road_address?.region_3depth_name ||
              '';
            return {
              address: addr,
              adminDongKey: [r1, r2, r3].filter(Boolean).join(' '),
              lat: Number(lat.toFixed(6)),
              lng: Number(lng.toFixed(6)),
              source: 'KAKAO LOCAL API',
            };
          })
          .filter((x): x is GeocodeCandidate => x !== null);

        if (docs.length > 0) {
          return NextResponse.json({ results: docs });
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  if (localMatches.length > 0) {
    return NextResponse.json({ results: localMatches });
  }

  // 3. 무료 오픈소스 OpenStreetMap Nominatim 폴백 (대한민국 범위)
  try {
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=kr&limit=5&addressdetails=1&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(nomUrl, {
      headers: {
        'User-Agent': 'LocalSpace-Contest-Prototype/1.0 (https://github.com/lilpong42/localspace)',
        'Accept-Language': 'ko',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const items = (await res.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
        address?: {
          province?: string;
          state?: string;
          city?: string;
          county?: string;
          borough?: string;
          suburb?: string;
          quarter?: string;
          neighbourhood?: string;
        };
      }>;

      const results: GeocodeCandidate[] = items
        .map((it): GeocodeCandidate | null => {
          const lat = Number.parseFloat(it.lat ?? '');
          const lng = Number.parseFloat(it.lon ?? '');
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const a = it.address ?? {};
          const sido = a.province || a.state || '';
          const sigungu = a.city || a.county || a.borough || '';
          const dong = a.quarter || a.suburb || a.neighbourhood || '';
          return {
            address: it.display_name || query,
            adminDongKey: [sido, sigungu, dong].filter(Boolean).join(' '),
            lat: Number(lat.toFixed(6)),
            lng: Number(lng.toFixed(6)),
            source: 'OSM NOMINATIM',
          };
        })
        .filter((x): x is GeocodeCandidate => x !== null);

      return NextResponse.json({ results });
    }
  } catch {
    // Fallback empty
  }

  return NextResponse.json({ results: [] });
}
