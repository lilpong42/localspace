'use client';

import L from 'leaflet';
import {
  Crosshair,
  Layers,
  LocateFixed,
  Moon,
  Search,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { haversineDistanceMeters } from '@/lib/compareEngine';
import type { CatalogListing } from '@/lib/propertyCatalog';
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
  catalogListings: CatalogListing[];
  focusedSlot: 'A' | 'B' | null;
  focusRequest?: MapFocusRequest | null;
  onChangeRadius: (radius: 300 | 500) => void;
  onSelectSlot: (slot: 'A' | 'B') => void;
  onApplyCatalogFromMap: (slot: 'A' | 'B', listing: CatalogListing) => void;
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

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * 네이버 부동산 / 호갱노노 스타일 가격·면적 말풍선 마커
 */
function createPriceBubbleIcon(
  slot: 'A' | 'B',
  monthlyFixedCost: number,
  areaPyeong: number,
  isFocused: boolean
) {
  const bg = slot === 'A' ? '#2563eb' : '#059669';
  const border = isFocused ? '#fde047' : '#ffffff';
  const ringClass = isFocused ? 'pin-bubble-active' : '';

  return L.divIcon({
    className: 'localspace-bubble-pin',
    html: `<div style="position:relative;display:inline-flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div class="${ringClass}" style="
        display:inline-flex;
        align-items:center;
        gap:6px;
        background:${bg};
        color:#ffffff;
        padding:5px 10px;
        border-radius:12px;
        border:2.5px solid ${border};
        box-shadow:0 8px 20px rgba(15,23,42,0.28);
        white-space:nowrap;
        font-family:Pretendard,sans-serif;
      ">
        <span style="
          display:inline-flex;align-items:center;justify-content:center;
          width:19px;height:19px;border-radius:6px;
          background:rgba(255,255,255,0.22);font-size:11px;font-weight:800;
        ">${slot}</span>
        <span style="font-size:12px;font-weight:800;letter-spacing:-0.02em;">월 ${monthlyFixedCost}만</span>
        <span style="font-size:11px;font-weight:600;opacity:0.88;">· ${areaPyeong}평</span>
      </div>
      <div style="
        width:0;height:0;
        border-left:7px solid transparent;
        border-right:7px solid transparent;
        border-top:8px solid ${bg};
        margin-top:-1px;
        filter:drop-shadow(0 3px 3px rgba(15,23,42,0.18));
      "></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -44],
  });
}

function createDistancePillIcon(distanceM: number) {
  const label =
    distanceM >= 1000
      ? `A↔B ${(distanceM / 1000).toFixed(1)}km`
      : `A↔B ${Math.round(distanceM)}m`;
  return L.divIcon({
    className: 'localspace-dist-pill',
    html: `<div style="
      transform:translate(-50%,-50%);
      display:inline-block;
      background:rgba(11,15,23,0.88);
      color:#fef08a;
      font-size:10.5px;
      font-weight:700;
      padding:3px 8px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,0.2);
      box-shadow:0 4px 12px rgba(15,23,42,0.24);
      white-space:nowrap;
    ">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createCatalogDotIcon(industry: string, rent: number) {
  return L.divIcon({
    className: 'localspace-catalog-pin',
    html: `<div style="
      transform:translate(-50%,-50%);
      display:inline-flex;
      align-items:center;
      gap:4px;
      background:rgba(255,255,255,0.96);
      color:#0f172a;
      font-size:10.5px;
      font-weight:700;
      padding:3px 7px;
      border-radius:999px;
      border:1.5px solid #cbd5e1;
      box-shadow:0 3px 10px rgba(15,23,42,0.14);
      white-space:nowrap;
    "><span style="width:6px;height:6px;border-radius:999px;background:#d97706;"></span>${escapeHtml(industry)} ${rent}만</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    popupAnchor: [0, -14],
  });
}

export default function ComparisonMap({
  candidateA,
  candidateB,
  comparison,
  radiusMeters,
  populations,
  catalogListings,
  focusedSlot,
  focusRequest,
  onChangeRadius,
  onSelectSlot,
  onApplyCatalogFromMap,
  onPickCoordinate,
}: ComparisonMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerARef = useRef<L.Marker | null>(null);
  const markerBRef = useRef<L.Marker | null>(null);

  const [pickMode, setPickMode] = useState<'A' | 'B' | null>(null);
  const [darkTiles, setDarkTiles] = useState(false);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogListing | null>(
    null
  );

  const pickModeRef = useRef<'A' | 'B' | null>(null);
  const onPickRef = useRef(onPickCoordinate);

  useEffect(() => {
    pickModeRef.current = pickMode;
  }, [pickMode]);

  useEffect(() => {
    onPickRef.current = onPickCoordinate;
  }, [onPickCoordinate]);

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

  // 핀 · 반경 원 · A↔B 거리선 · 주변 카탈로그 매물 · 주변 상가 점포 갱신
  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 1. 반경 원형 영역
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

    // 2. A ↔ B 직선 거리선 + 거리 배지 (50m 이상 떨어져 있을 때)
    const pairDist = haversineDistanceMeters(
      candidateA.lat,
      candidateA.lng,
      candidateB.lat,
      candidateB.lng
    );
    if (pairDist >= 50 && pairDist <= 25000) {
      L.polyline(
        [
          [candidateA.lat, candidateA.lng],
          [candidateB.lat, candidateB.lng],
        ],
        {
          color: '#334155',
          weight: 2,
          opacity: 0.55,
          dashArray: '5 6',
        }
      ).addTo(group);

      const midLat = (candidateA.lat + candidateB.lat) / 2;
      const midLng = (candidateA.lng + candidateB.lng) / 2;
      L.marker([midLat, midLng], {
        icon: createDistancePillIcon(pairDist),
        interactive: false,
        zIndexOffset: 250,
      }).addTo(group);
    }

    // 3. 반경 내 공공 상가 점포 마커
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
          radius: isSame ? 5 : 3.2,
          color: isSame ? '#ffffff' : '#64748b',
          weight: isSame ? 1.5 : 0.7,
          fillColor: isSame ? highlightColor : '#94a3b8',
          fillOpacity: isSame ? 0.92 : 0.5,
        })
          .bindPopup(
            `<div>
              <div style="font-weight:800;color:#0f172a;">${escapeHtml(s.name)}</div>
              <div style="color:#475569;margin-top:2px;">${escapeHtml(s.standardCategory)} · ${escapeHtml(s.smallCategory)}</div>
              <div style="color:#64748b;font-size:11px;margin-top:2px;">${escapeHtml(s.roadAddress)} (${s.distanceM}m)</div>
            </div>`
          )
          .addTo(group);
      }
    };

    addStores(comparison.evalA.commercial.nearbyStores, candidateA.industry, '#2563eb');
    addStores(comparison.evalB.commercial.nearbyStores, candidateB.industry, '#059669');

    // 4. 인근 다른 샘플 매물 미니 핀 (클릭 시 지도에서 바로 A/B 교체 가능!)
    for (const item of catalogListings) {
      if (item.name === candidateA.name || item.name === candidateB.name) continue;
      const dA = haversineDistanceMeters(candidateA.lat, candidateA.lng, item.lat, item.lng);
      const dB = haversineDistanceMeters(candidateB.lat, candidateB.lng, item.lat, item.lng);
      if (Math.min(dA, dB) > 2500) continue;

      const m = L.marker([item.lat, item.lng], {
        icon: createCatalogDotIcon(item.industry, item.monthlyRent + item.maintenanceFee),
        zIndexOffset: 200,
      }).addTo(group);
      m.on('click', () => setSelectedCatalog(item));
    }

    // 5. 후보 A & B 가격·면적 말풍선 메인 핀
    markerARef.current = L.marker([candidateA.lat, candidateA.lng], {
      icon: createPriceBubbleIcon(
        'A',
        comparison.evalA.monthlyFixedCost,
        candidateA.areaPyeong,
        focusedSlot === 'A'
      ),
      zIndexOffset: focusedSlot === 'A' ? 700 : 550,
    })
      .on('click', () => {
        setSelectedCatalog(null);
        onSelectSlot('A');
      })
      .bindPopup(
        `<div>
          <div style="font-weight:800;color:#1d4ed8;">후보 A · ${escapeHtml(candidateA.name)}</div>
          <div style="color:#334155;margin-top:2px;">${escapeHtml(candidateA.industry)} · ${candidateA.areaPyeong}평 · 매달 ${comparison.evalA.monthlyFixedCost}만원</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">반경 ${radiusMeters}m 전체 ${comparison.evalA.commercial.totalStores}곳 / 동종 ${comparison.evalA.commercial.sameIndustryCount}곳 (${comparison.evalA.commercial.sameIndustryDensityPct}%)</div>
        </div>`
      )
      .addTo(group);

    markerBRef.current = L.marker([candidateB.lat, candidateB.lng], {
      icon: createPriceBubbleIcon(
        'B',
        comparison.evalB.monthlyFixedCost,
        candidateB.areaPyeong,
        focusedSlot === 'B'
      ),
      zIndexOffset: focusedSlot === 'B' ? 700 : 550,
    })
      .on('click', () => {
        setSelectedCatalog(null);
        onSelectSlot('B');
      })
      .bindPopup(
        `<div>
          <div style="font-weight:800;color:#047857;">후보 B · ${escapeHtml(candidateB.name)}</div>
          <div style="color:#334155;margin-top:2px;">${escapeHtml(candidateB.industry)} · ${candidateB.areaPyeong}평 · 매달 ${comparison.evalB.monthlyFixedCost}만원</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">반경 ${radiusMeters}m 전체 ${comparison.evalB.commercial.totalStores}곳 / 동종 ${comparison.evalB.commercial.sameIndustryCount}곳 (${comparison.evalB.commercial.sameIndustryDensityPct}%)</div>
        </div>`
      )
      .addTo(group);

    const bounds = circleA.getBounds().extend(circleB.getBounds());
    map.fitBounds(bounds, { padding: [64, 64], maxZoom: 16 });
  }, [
    candidateA,
    candidateB,
    comparison,
    radiusMeters,
    catalogListings,
    focusedSlot,
    onSelectSlot,
  ]);

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
    onPickCoordinate(slot, hit.lat, hit.lng, hit.address, matchedPop?.key);
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
        className={`absolute inset-0 h-full w-full ${
          darkTiles ? 'map-dark-tiles' : 'map-light-tiles'
        } ${pickMode ? 'cursor-crosshair' : ''}`}
      />

      {/* 플로팅 상단: 주소 검색 + 반경/카메라/핀찍기/주야간 */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 right-3.5 z-[400] flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto w-full max-w-[330px]">
          <form
            onSubmit={handleMapSearch}
            className="flex items-center overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-md"
          >
            <Search className="ml-3.5 h-4 w-4 shrink-0 text-slate-400" />
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
              className="h-10 bg-[#0B0F17] px-3.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {searching ? '...' : '검색'}
            </button>
          </form>

          {(searchHits.length > 0 || searchError) && (
            <div className="mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white/98 shadow-xl">
              {searchError ? (
                <div className="px-3.5 py-2.5 text-xs text-rose-600">{searchError}</div>
              ) : (
                <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                  {searchHits.map((hit, idx) => (
                    <div key={idx} className="p-3">
                      <div className="line-clamp-1 text-xs font-bold text-slate-900">
                        {hit.address}
                      </div>
                      <div className="mt-0.5 text-[10.5px] text-slate-400">
                        {hit.adminDongKey || `${hit.lat}, ${hit.lng}`} · {hit.source}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyHit('A', hit)}
                          className="flex-1 rounded-lg bg-blue-600 py-1.5 text-[11px] font-bold text-white hover:bg-blue-700"
                        >
                          후보 A로 지정
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHit('B', hit)}
                          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700"
                        >
                          후보 B로 지정
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 플로팅 우측 도구 모음 */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {/* 반경 300m / 500m */}
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-lg backdrop-blur-md">
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
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-lg backdrop-blur-md">
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
                onSelectSlot('A');
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
                onSelectSlot('B');
                mapRef.current?.flyTo([candidateB.lat, candidateB.lng], 16, { duration: 0.5 });
                markerBRef.current?.openPopup();
              }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50"
            >
              B
            </button>
          </div>

          {/* 지도 클릭으로 핀 직접 찍기 */}
          <div className="inline-flex rounded-xl border border-slate-200/90 bg-white/95 p-0.5 shadow-lg backdrop-blur-md">
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

          {/* 주간 / 야간 지도 스위치 (한냥 AirGuard 시그니처) */}
          <button
            type="button"
            onClick={() => setDarkTiles((v) => !v)}
            title={darkTiles ? '주간 지도로 전환' : '야간 지도로 전환'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white/95 text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-slate-100"
          >
            {darkTiles ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* 핀 찍기 활성 안내 배너 */}
      {pickMode && (
        <div className="pointer-events-none absolute top-16 left-1/2 z-[400] -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#0B0F17] px-4 py-2 text-xs font-bold text-white shadow-xl">
            <Crosshair className="h-3.5 w-3.5 text-amber-300" />
            지도의 원하는 골목을 클릭하면 후보 {pickMode} 핀이 즉시 이동합니다
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

      {/* 인근 카탈로그 매물 핀 클릭 시 뜨는 플로팅 퀵 교체 카드 */}
      {selectedCatalog && (
        <div className="pointer-events-auto absolute bottom-16 left-3.5 z-[410] w-[300px] rounded-2xl border border-slate-200 bg-white/98 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="rounded bg-[#FFFBEB] px-1.5 py-0.5 text-[10px] font-bold text-[#92400E] border border-[#FDE68A]">
                주변 추천 매물 · {selectedCatalog.industry}
              </span>
              <div className="mt-1 text-sm font-extrabold text-slate-900">
                {selectedCatalog.name}
              </div>
              <div className="mt-0.5 text-xs tabular-nums text-slate-500">
                매달 {selectedCatalog.monthlyRent + selectedCatalog.maintenanceFee}만 ·{' '}
                {selectedCatalog.areaPyeong}평 · {selectedCatalog.floor}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedCatalog(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                onApplyCatalogFromMap('A', selectedCatalog);
                setSelectedCatalog(null);
              }}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              후보 A로 교체
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyCatalogFromMap('B', selectedCatalog);
                setSelectedCatalog(null);
              }}
              className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              후보 B로 교체
            </button>
          </div>
        </div>
      )}

      {/* 플로팅 하단 범례 + 필수 가드레일 바 */}
      <div className="pointer-events-none absolute bottom-3.5 left-3.5 right-14 z-[400]">
        <div className="pointer-events-auto inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-slate-200/90 bg-white/95 px-3.5 py-2 text-[11px] text-slate-600 shadow-lg backdrop-blur-md">
          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            A 동종 {comparison.evalA.commercial.sameIndustryCount}곳
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-slate-800">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            B 동종 {comparison.evalB.commercial.sameIndustryCount}곳
          </span>
          <span className="inline-flex items-center gap-1 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            주변 매물(클릭 교체)
          </span>
          <span className="hidden text-slate-300 sm:inline">|</span>
          <span className="inline-flex items-center gap-1 font-medium text-blue-800">
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
