'use client';

import {
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { pyeongToSqm, sqmToPyeong } from '@/lib/compareEngine';
import { QUICK_ADDRESS_OPTIONS } from '@/lib/presets';
import {
  BUSINESS_CATEGORIES,
  FLOOR_OPTIONS,
  type BusinessCategory,
  type CandidateProperty,
  type FloorOption,
  type PopulationRecord,
} from '@/lib/types';

interface CandidateEditModalProps {
  candidate: CandidateProperty;
  populations: PopulationRecord[];
  onChange: (next: CandidateProperty) => void;
  onClose: () => void;
  onCloseAndReanalyze: () => void;
}

export function CandidateEditModal({
  candidate,
  populations,
  onChange,
  onClose,
  onCloseAndReanalyze,
}: CandidateEditModalProps) {
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);
  const [showCoords, setShowCoords] = useState(false);

  const isA = candidate.slot === 'A';
  const badgeCls = isA ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white';

  const handleQuickAddress = (addressValue: string) => {
    const found = QUICK_ADDRESS_OPTIONS.find((opt) => opt.address === addressValue);
    if (!found) return;
    setGeocodeMsg(`내장 좌표 적용됨 (${found.regionTag})`);
    onChange({
      ...candidate,
      address: found.address,
      adminDongKey: found.adminDongKey,
      lat: found.lat,
      lng: found.lng,
    });
  };

  const handleGeocodeSearch = async () => {
    const q = candidate.address.trim();
    if (q.length < 2) return;
    setGeocoding(true);
    setGeocodeMsg(null);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('geocode failed');
      const data = (await res.json()) as {
        results?: Array<{
          address: string;
          adminDongKey: string;
          lat: number;
          lng: number;
          source: string;
        }>;
      };
      const first = data.results?.[0];
      if (!first) {
        setGeocodeMsg('주소를 찾지 못했습니다. 아래 좌표 직접 입력을 열어 수정할 수 있습니다.');
        return;
      }
      const matchedPop = populations.find(
        (p) =>
          p.key === first.adminDongKey ||
          (first.adminDongKey && first.adminDongKey.includes(p.adminDong))
      );
      onChange({
        ...candidate,
        address: first.address,
        adminDongKey: matchedPop ? matchedPop.key : candidate.adminDongKey,
        lat: first.lat,
        lng: first.lng,
      });
      setGeocodeMsg(`좌표가 지도에 반영되었습니다 (${first.source})`);
    } catch {
      setGeocodeMsg('주소 검색 중 일시적 오류가 발생했습니다.');
    } finally {
      setGeocoding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`후보 ${candidate.slot} 매물 조건 및 임장 메모 수정`}
    >
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${badgeCls}`}
            >
              {candidate.slot}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                후보 {candidate.slot} 매물 조건 · 메모 수정
              </h2>
              <p className="text-xs text-slate-500">
                값을 수정하면 비교표와 지도에 즉시 반영됩니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 스크롤 본문 */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 섹션 1: 매물명 & 위치 */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-slate-500" />
              1. 매물 이름과 위치
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">후보지 별칭</span>
              <input
                type="text"
                value={candidate.name}
                onChange={(e) => onChange({ ...candidate, name: e.target.value })}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">
                빠른 위치 선택 (시연용 추천 주소)
              </span>
              <select
                value={
                  QUICK_ADDRESS_OPTIONS.some((o) => o.address === candidate.address)
                    ? candidate.address
                    : ''
                }
                onChange={(e) => handleQuickAddress(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="">직접 입력하거나 아래 추천 위치를 선택하세요</option>
                {QUICK_ADDRESS_OPTIONS.map((opt) => (
                  <option key={opt.address} value={opt.address}>
                    [{opt.regionTag}] {opt.address}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">
                도로명 주소 (입력 후 좌표 검색)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={candidate.address}
                  onChange={(e) => onChange({ ...candidate, address: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleGeocodeSearch();
                    }
                  }}
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
                <button
                  type="button"
                  disabled={geocoding}
                  onClick={() => void handleGeocodeSearch()}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                >
                  <Search className="h-3.5 w-3.5" />
                  {geocoding ? '검색 중' : '좌표 검색'}
                </button>
              </div>
              {geocodeMsg && (
                <p className="text-xs font-medium text-blue-700">{geocodeMsg}</p>
              )}
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-600">
                행정동 선택 (거주 배후인구 조회 기준)
              </span>
              <select
                value={candidate.adminDongKey}
                onChange={(e) =>
                  onChange({ ...candidate, adminDongKey: e.target.value })
                }
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              >
                {populations.map((pop) => (
                  <option key={pop.key} value={pop.key}>
                    {pop.sido} {pop.sigungu} {pop.adminDong} (거주 {pop.totalPopulation.toLocaleString()}명)
                  </option>
                ))}
              </select>
            </label>

            {/* 위도·경도 고급 설정 접기 */}
            <div>
              <button
                type="button"
                onClick={() => setShowCoords((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {showCoords ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                위도·경도 좌표 직접 입력 ({candidate.lat.toFixed(4)}, {candidate.lng.toFixed(4)})
              </button>
              {showCoords && (
                <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">위도 (Latitude)</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={candidate.lat}
                      onChange={(e) =>
                        onChange({
                          ...candidate,
                          lat: Number.parseFloat(e.target.value) || candidate.lat,
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs tabular-nums text-slate-900"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-slate-500">경도 (Longitude)</span>
                    <input
                      type="number"
                      step="0.0001"
                      value={candidate.lng}
                      onChange={(e) =>
                        onChange({
                          ...candidate,
                          lng: Number.parseFloat(e.target.value) || candidate.lng,
                        })
                      }
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs tabular-nums text-slate-900"
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 섹션 2: 임대 조건 & 면적 */}
          <section className="space-y-3.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2 className="h-4 w-4 text-slate-500" />
              2. 업종 · 비용 · 면적 조건
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">비교 업종</span>
                <select
                  value={candidate.industry}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      industry: e.target.value as BusinessCategory,
                    })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                >
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">층수</span>
                <select
                  value={candidate.floor}
                  onChange={(e) =>
                    onChange({ ...candidate, floor: e.target.value as FloorOption })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                >
                  {FLOOR_OPTIONS.map((fl) => (
                    <option key={fl} value={fl}>
                      {fl}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">보증금 (만원)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={candidate.deposit}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      deposit: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">월세 (만원)</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={candidate.monthlyRent}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      monthlyRent: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">월 관리비 (만원)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={candidate.maintenanceFee}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      maintenanceFee: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">면적 (평)</span>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={candidate.areaPyeong}
                    onChange={(e) =>
                      onChange({
                        ...candidate,
                        areaPyeong: Math.max(0.5, Number(e.target.value) || 0.5),
                      })
                    }
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm font-semibold tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-600">면적 (㎡)</span>
                  <input
                    type="number"
                    min={3}
                    step={1}
                    value={pyeongToSqm(candidate.areaPyeong)}
                    onChange={(e) => {
                      const sqm = Math.max(3, Number(e.target.value) || 3);
                      onChange({ ...candidate, areaPyeong: sqmToPyeong(sqm) });
                    }}
                    className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm tabular-nums text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">권리금 (만원)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={candidate.keyMoney}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      keyMoney: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">예상 수리비 (만원)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={candidate.repairCost}
                  onChange={(e) =>
                    onChange({
                      ...candidate,
                      repairCost: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                />
              </label>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* 섹션 3: 현장 방문 메모 */}
          <section className="space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <FileText className="h-4 w-4 text-slate-500" />
              3. 현장 방문 메모 (임장 기록)
            </div>
            <p className="text-xs text-slate-500">
              배수·덕트·주차·렌트프리 등 직접 보고 들은 내용을 적으면 AI 질문 체크리스트에 자동 반영됩니다.
            </p>
            <textarea
              rows={4}
              value={candidate.fieldNotes}
              onChange={(e) =>
                onChange({ ...candidate, fieldNotes: e.target.value })
              }
              placeholder="예: 배수관 노후 흔적 있음, 렌트프리 1개월 협의 가능 여부 확인 필요"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </section>
        </div>

        {/* 하단 액션 바 */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Check className="h-4 w-4" />
            적용하고 닫기
          </button>
          <button
            type="button"
            onClick={onCloseAndReanalyze}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0B0F17] px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            적용 후 AI 다시 분석
          </button>
        </div>
      </div>
    </div>
  );
}
