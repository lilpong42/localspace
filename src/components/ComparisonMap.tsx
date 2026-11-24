'use client';

import L from 'leaflet';
import {
  Crosshair,
  Layers,
  LocateFixed,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  CandidateProperty,
  ComparisonSummary,
  PopulationRecord,
} from '@/lib/types';

export interface MapFocusRequest {
  slot: 'A' | 'B' | 'both';
  nonce: number;
}

interface ComparisonMapProps {
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  radiusMeters: 300 | 500;
  populations: PopulationRecord[];
  focusRequest?: MapFocusRequest | null;
  onChangeRadius: (radius: 300 | 500) => void;
  onPickCoordinate: (
    slot: 'A' | 'B',
    lat: number,
    lng: number,
    address?: string,
    adminDongKey?: string
  ) => void;
}

interface SearchHit {
  address: string;
  adminDongKey: string;
  lat: number;
  lng: number;
  source: string;
}

function createPinIcon(label: 'A' | 'B', colorHex: string) {
  return L.divIcon({
    className: 'localspace-pin-icon',
    html: `<div style="
      width: 34px;
      height: 34px;
      border-radius: 9999px;
      background: ${colorHex};
      color: #ffffff;
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid #ffffff;
      box-shadow: 0 6px 16px rgba(15,23,42,0.32);
    ">${label}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export default function ComparisonMap({
  candidateA,
  candidateB,
  comparison,
  radiusMeters,
  populations,
  focusRequest,
  onChangeRadius,
  onPickCoordinate,
}: ComparisonMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerARef = useRef<L.Marker | null>(null);
  const markerBRef = useRef<L.Marker | null>(null);

  const [pickMode, setPickMode] = useState<'A' | 'B' | null>(null);
  const pickModeRef = useRef<'A' | 'B' | null>(null);
  const onPickRef = useRef(onPickCoordinate);

  useEffect(() => {
    pickModeRef.current = pickMode;
  }, [pickMode]);

  useEffect(() => {
    onPickRef.current = onPickCoordinate;
  }, [onPickCoordinate]);

  // 지도 위 실시간 주소 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<SearchHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [candidateA.lat, candidateA.lng],
      zoom: 15,
      zoomControl: false,
      scrollWheelZoom: true,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    map.on('click', (ev: L.LeafletMouseEvent) => {
      const activeSlot = pickModeRef.current;
      if (!activeSlot) return;
      const lat = Number(ev.latlng.lat.toFixed(6));
      const lng = Number(ev.latlng.lng.toFixed(6));
      onPickRef.current(activeSlot, lat, lng);
      setPickMode(null);
    });

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      observer = new ResizeObserver(() => {
        map.invalidateSize();
      });
      observer.observe(containerRef.current);
    }

    return () => {
      window.clearTimeout(resizeTimer);
      observer?.disconnect();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      markerARef.current = null;
      markerBRef.current = null;
    };
  }, [candidateA.lat, candidateA.lng]);

  // 핀 · 반경 원 · 주변 점포 실시간 갱신
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const circleA = L.circle([candidateA.lat, candidateA.lng], {
      radius: radiusMeters,
      color: '#2563eb',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.11,
      dashArray: '6 4',
    }).addTo(group);

    const circleB = L.circle([candidateB.lat, candidateB.lng], {
      radius: radiusMeters,
      color: '#059669',
      weight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.11,
      dashArray: '6 4',
    }).addTo(group);

    const renderedStoreIds = new Set<string>();
    const addStores = (
      stores: ComparisonSummary['evalA']['commercial']['nearbyStores'],
      targetIndustry: string,
      highlightColor: string
    ) => {
      for (const s of stores) {
        if (renderedStoreIds.has(s.id)) continue;
        renderedStoreIds.add(s.id);
        const isSame = s.standardCategory === targetIndustry;
        L.circleMarker([s.lat, s.lng], {
          radius: isSame ? 5.5 : 3.5,
          color: isSame ? '#ffffff' : '#64748b',
          weight: isSame ? 1.5 : 0.8,
          fillColor: isSame ? highlightColor : '#94a3b8',
          fillOpacity: isSame ? 0.94 : 0.55,
        })
          .bindPopup(
            `<div>
              <div style="font-weight:700;color:#0f172a;">${escapeHtml(s.name)}</div>
              <div style="color:#475569;margin-top:2px;">${escapeHtml(s.standardCategory)} · ${escapeHtml(s.smallCategory)}</div>
              <div style="color:#64748b;font-size:11px;margin-top:2px;">${escapeHtml(s.roadAddress)} (${s.distanceM}m)</div>
            </div>`
          )
          .addTo(group);
      }
    };

    addStores(comparison.evalA.commercial.nearbyStores, candidateA.industry, '#2563eb');
    addStores(comparison.evalB.commercial.nearbyStores, candidateB.industry, '#059669');

    markerARef.current = L.marker([candidateA.lat, candidateA.lng], {
      icon: createPinIcon('A', '#2563eb'),
      zIndexOffset: 500,
    })
      .bindPopup(
        `<div>
          <div style="font-weight:700;color:#1d4ed8;">후보 A · ${escapeHtml(candidateA.name)}</div>
          <div style="color:#334155;margin-top:2px;">${escapeHtml(candidateA.industry)} · ${candidateA.areaPyeong}평 · 매달 ${comparison.evalA.monthlyFixedCost}만원</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">반경 ${radiusMeters}m 전체 ${comparison.evalA.commercial.totalStores}곳 / 동종 ${comparison.evalA.commercial.sameIndustryCount}곳 (${comparison.evalA.commercial.sameIndustryDensityPct}%)</div>
        </div>`
      )
      .addTo(group);

    markerBRef.current = L.marker([candidateB.lat, candidateB.lng], {
      icon: createPinIcon('B', '#059669'),
      zIndexOffset: 500,
    })
      .bindPopup(
        `<div>
          <div style="font-weight:700;color:#047857;">후보 B · ${escapeHtml(candidateB.name)}</div>
          <div style="color:#334155;margin-top:2px;">${escapeHtml(candidateB.industry)} · ${candidateB.areaPyeong}평 · 매달 ${comparison.evalB.monthlyFixedCost}만원</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">반경 ${radiusMeters}m 전체 ${comparison.evalB.commercial.totalStores}곳 / 동종 ${comparison.evalB.commercial.sameIndustryCount}곳 (${comparison.evalB.commercial.sameIndustryDensityPct}%)</div>
        </div>`
      )
      .addTo(group);

    const bounds = circleA.getBounds().extend(circleB.getBounds());
    map.fitBounds(bounds, { padding: [52, 52], maxZoom: 16 });
  }, [candidateA, candidateB, comparison, radiusMeters]);

  // 외부 카드 클릭 시 지도 카메라 이동 & 팝업 열기
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusRequest) return;
    if (focusRequest.slot === 'A') {
      map.flyTo([candidateA.lat, candidateA.lng], 16, { duration: 0.55 });
      markerARef.current?.openPopup();
    } else if (focusRequest.slot === 'B') {
      map.flyTo([candidateB.lat, candidateB.lng], 16, { duration: 0.55 });
      markerBRef.current?.openPopup();
    } else {
      const b = L.latLngBounds(
        [candidateA.lat, candidateA.lng],
        [candidateB.lat, candidateB.lng]
      ).pad(0.45);
      map.fitBounds(b, { maxZoom: 16 });
    }
  }, [focusRequest, candidateA.lat, candidateA.lng, candidateB.lat, candidateB.lng]);

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q.length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('failed');
      const data = (await res.json()) as { results?: SearchHit[] };
      const hits = data.results ?? [];
      setSearchHits(hits);
      if (hits.length === 0) {
        setSearchError('검색 결과가 없습니다. 도로명이나 동 이름을 입력해 보세요.');
      }
    } catch {
      setSearchError('주소 검색 중 오류가 발생했습니다.');
    } finally {
      setSearching(false);
    }
  };

  const applyHit = (slot: 'A' | 'B', hit: SearchHit) => {
    const matchedPop = populations.find(
      (p) =>
        p.key === hit.adminDongKey ||
        (hit.adminDongKey && hit.adminDongKey.includes(p.adminDong))
    );
    onPickCoordinate(
      slot,
      hit.lat,
      hit.lng,
      hit.address,
      matchedPop?.key
    );
    setSearchHits([]);
    setSearchQuery('');
    mapRef.current?.flyTo([hit.lat, hit.lng], 16, { duration: 0.5 });
  };

  const fitBoth = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = L.latLngBounds(
      [candidateA.lat, candidateA.lng],
      [candidateB.lat, candidateB.lng]
    ).pad(0.45);
    map.fitBounds(b, { maxZoom: 16 });
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-100">
      {/* 실제 Leaflet 캔버스 */}
      <div
        ref={containerRef}
        id="localspace-leaflet-map"
        className={`absolute inset-0 h-full w-full ${pickMode ? 'cursor-crosshair' : ''}`}
      />

      {/* 플로팅 상단 좌측: 지도 위 주소 바로 검색 */}
      <div className="pointer-events-none absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto w-full max-w-[320px]">
          <form
            onSubmit={handleMapSearch}
            className="flex items-center overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-md backdrop-blur-xs"
          >
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="주소·동네 검색 (예: 영주 가흥동, 지행역)"
              className="h-10 flex-1 bg-transparent px-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchHits([]);
                  setSearchError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={searching}
              className="h-10 bg-[#0B0F17] px-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {searching ? '...' : '검색'}
            </button>
          </form>

          {(searchHits.length > 0 || searchError) && (
            <div className="mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white/98 shadow-lg">
              {searchError ? (
                <div className="px-3 py-2.5 text-xs text-rose-600">{searchError}</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                  {searchHits.map((hit, idx) => (
                    <div key={idx} className="p-2.5">
                      <div className="text-xs font-bold text-slate-900 line-clamp-1">
                        {hit.address}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-slate-400">
                        {hit.adminDongKey || `${hit.lat}, ${hit.lng}`} · {hit.source}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyHit('A', hit)}
                          className="flex-1 rounded-lg bg-blue-600 py-1 text-[11px] font-bold text-white hover:bg-blue-700"
                        >
                          후보 A 위치로 설정
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHit('B', hit)}
                          className="flex-1 rounded-lg bg-emerald-600 py-1 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          후보 B 위치로 설정
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 플로팅 상단 우측: 반경 스위치 + 카메라 이동 + 지도 클릭 위치 찍기 */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {/* 반경 300m / 500m */}
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-md backdrop-blur-xs">
            {([300, 500] as const).map((r) => (
              <button
                key={r}
                id={`map-radius-btn-${r}`}
                type="button"
                onClick={() => onChangeRadius(r)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums transition ${
                  radiusMeters === r
                    ? 'bg-[#0B0F17] text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}m
              </button>
            ))}
          </div>

          {/* 뷰 포커스 */}
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-md backdrop-blur-xs">
            <button
              type="button"
              onClick={fitBoth}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              title="후보 A와 B 모두 보기"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              전체
            </button>
            <button
              type="button"
              onClick={() => {
                mapRef.current?.flyTo([candidateA.lat, candidateA.lng], 16, { duration: 0.5 });
                markerARef.current?.openPopup();
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-blue-700 hover:bg-blue-50"
            >
              A
            </button>
            <button
              type="button"
              onClick={() => {
                mapRef.current?.flyTo([candidateB.lat, candidateB.lng], 16, { duration: 0.5 });
                markerBRef.current?.openPopup();
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50"
            >
              B
            </button>
          </div>

          {/* 지도 클릭으로 핀 직접 찍기 */}
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-md backdrop-blur-xs">
            <button
              type="button"
              onClick={() => setPickMode((prev) => (prev === 'A' ? null : 'A'))}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                pickMode === 'A'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              A 찍기
            </button>
            <button
              type="button"
              onClick={() => setPickMode((prev) => (prev === 'B' ? null : 'B'))}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                pickMode === 'B'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" />
              B 찍기
            </button>
          </div>
        </div>
      </div>

      {/* 핀 찍기 활성 안내 토스트 */}
      {pickMode && (
        <div className="pointer-events-none absolute top-16 left-1/2 z-[400] -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#0B0F17] px-4 py-2 text-xs font-bold text-white shadow-lg">
            <Crosshair className="h-3.5 w-3.5 text-amber-300" />
            지도의 원하는 지점을 클릭하면 후보 {pickMode} 위치가 즉시 이동합니다
            <button
              type="button"
              onClick={() => setPickMode(null)}
              className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] hover:bg-white/25"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 하단 범례 + 필수 가드레일 배지 (지도 위 깔끔한 글래스 바) */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-12 z-[400]">
        <div className="pointer-events-auto inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-[11px] text-slate-600 shadow-md backdrop-blur-xs">
          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            A 동종({comparison.evalA.commercial.sameIndustryCount})
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            B 동종({comparison.evalB.commercial.sameIndustryCount})
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            기타 점포
          </span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span className="inline-flex items-center gap-1 text-blue-800 font-medium">
            <Layers className="h-3 w-3 shrink-0" />
            상권 = 입력 주소 반경({radiusMeters}m) 기준 / 인구 = 선택 행정구역 단위 기준
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <Users className="h-3 w-3 shrink-0" />
            거주 배후인구 참고자료 (실제 유동인구 아님)
          </span>
        </div>
      </div>
    </div>
  );
}
