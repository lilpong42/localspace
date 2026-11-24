'use client';

import L from 'leaflet';
import { LocateFixed, Map as MapIcon } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { CandidateProperty, ComparisonSummary } from '@/lib/types';

interface ComparisonMapProps {
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  radiusMeters: 300 | 500;
}

function createPinIcon(label: 'A' | 'B', colorHex: string) {
  return L.divIcon({
    className: 'localspace-pin-icon',
    html: `<div style="
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      background: ${colorHex};
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
      box-shadow: 0 4px 12px rgba(15,23,42,0.28);
    ">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
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
}: ComparisonMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [candidateA.lat, candidateA.lng],
      zoom: 15,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
  }, [candidateA.lat, candidateA.lng]);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    // 반경 원형 영역 (후보 A 블루 / 후보 B 에메랄드)
    const circleA = L.circle([candidateA.lat, candidateA.lng], {
      radius: radiusMeters,
      color: '#2563eb',
      weight: 2,
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      dashArray: '6 4',
    }).addTo(group);

    const circleB = L.circle([candidateB.lat, candidateB.lng], {
      radius: radiusMeters,
      color: '#059669',
      weight: 2,
      fillColor: '#10b981',
      fillOpacity: 0.1,
      dashArray: '6 4',
    }).addTo(group);

    // 반경 내 주변 점포 마커 (중복 ID 제거 후 동종 강조)
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
          radius: isSame ? 5 : 3.5,
          color: isSame ? '#ffffff' : '#64748b',
          weight: isSame ? 1.5 : 0.8,
          fillColor: isSame ? highlightColor : '#94a3b8',
          fillOpacity: isSame ? 0.92 : 0.55,
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

    // 후보 A & B 마커 (최상단)
    L.marker([candidateA.lat, candidateA.lng], {
      icon: createPinIcon('A', '#2563eb'),
      zIndexOffset: 500,
    })
      .bindPopup(
        `<div>
          <div style="font-weight:700;color:#1d4ed8;">후보 A · ${escapeHtml(candidateA.name)}</div>
          <div style="color:#334155;margin-top:2px;">${escapeHtml(candidateA.industry)} · ${candidateA.areaPyeong}평 · 월 고정비 ${comparison.evalA.monthlyFixedCost}만원</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">반경 ${radiusMeters}m 전체 ${comparison.evalA.commercial.totalStores}개 / 동종 ${comparison.evalA.commercial.sameIndustryCount}개 (${comparison.evalA.commercial.sameIndustryDensityPct}%)</div>
        </div>`
      )
      .addTo(group);

    L.marker([candidateB.lat, candidateB.lng], {
      icon: createPinIcon('B', '#059669'),
      zIndexOffset: 500,
    })
      .bindPopup(
        `<div>
          <div style="font-weight:700;color:#047857;">후보 B · ${escapeHtml(candidateB.name)}</div>
          <div style="color:#334155;margin-top:2px;">${escapeHtml(candidateB.industry)} · ${candidateB.areaPyeong}평 · 월 고정비 ${comparison.evalB.monthlyFixedCost}만원</div>
          <div style="color:#64748b;font-size:11px;margin-top:2px;">반경 ${radiusMeters}m 전체 ${comparison.evalB.commercial.totalStores}개 / 동종 ${comparison.evalB.commercial.sameIndustryCount}개 (${comparison.evalB.commercial.sameIndustryDensityPct}%)</div>
        </div>`
      )
      .addTo(group);

    // 두 원형 영역을 모두 포함하도록 자동 바운드 피팅
    const bounds = circleA.getBounds().extend(circleB.getBounds());
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 16 });
  }, [candidateA, candidateB, comparison, radiusMeters]);

  const fitBoth = () => {
    const map = mapRef.current;
    if (!map) return;
    const b = L.latLngBounds(
      [candidateA.lat, candidateA.lng],
      [candidateB.lat, candidateB.lng]
    ).pad(0.45);
    map.fitBounds(b, { maxZoom: 16 });
  };

  const focusPoint = (lat: number, lng: number) => {
    mapRef.current?.setView([lat, lng], 16, { animate: true });
  };

  return (
    <section
      className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-6"
      aria-label="후보 A vs 후보 B 오픈소스 반경 지도"
    >
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900 sm:text-base">
              후보 A·B 위치 및 반경 {radiusMeters}m 주변 점포 지도
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            핀이나 주변 점포를 클릭하면 상호·업종·거리를 바로 확인할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={fitBoth}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            전체 보기
          </button>
          <button
            type="button"
            onClick={() => focusPoint(candidateA.lat, candidateA.lng)}
            className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
          >
            후보 A 보기
          </button>
          <button
            type="button"
            onClick={() => focusPoint(candidateB.lat, candidateB.lng)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
          >
            후보 B 보기
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        id="localspace-leaflet-map"
        className="h-[380px] w-full overflow-hidden rounded-xl border border-slate-200"
      />

      {/* 범례 */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block h-3 w-3 rounded-full bg-blue-600" />
            후보 A · 반경 {radiusMeters}m 동종 점포
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block h-3 w-3 rounded-full bg-emerald-600" />
            후보 B · 반경 {radiusMeters}m 동종 점포
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-500">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
            기타 업종 점포
          </span>
        </div>
        <span className="text-[11px] text-slate-400">OpenStreetMap · Leaflet</span>
      </div>
    </section>
  );
}
