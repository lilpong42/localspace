'use client';

import { AlertTriangle, Info, Layers, Users } from 'lucide-react';
import type { DataSourceMeta } from '@/lib/types';

interface GuardrailStripProps {
  meta: DataSourceMeta;
  radiusMeters: 300 | 500;
  industryMismatch: boolean;
  industryMismatchMessage: string | null;
  industryA: string;
  industryB: string;
}

export function GuardrailStrip({
  meta,
  radiusMeters,
  industryMismatch,
  industryMismatchMessage,
  industryA,
  industryB,
}: GuardrailStripProps) {
  return (
    <section
      aria-label="데이터 해석 기준 및 비교 오류 방지 안내"
      className="space-y-3"
    >
      {/* 필수 노출 배지 3 - 업종 상이 경고 배너 (해당 시 가장 눈에 잘 띄게 상단 강조) */}
      {industryMismatch && industryMismatchMessage && (
        <div
          id="industry-mismatch-banner"
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 text-amber-950 shadow-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-bold text-amber-950 sm:text-[15px]">
                {industryMismatchMessage}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-amber-900 sm:text-[13px]">
                현재 <strong>후보 A({industryA})</strong>와{' '}
                <strong>후보 B({industryB})</strong>는 업종이 다릅니다. 단순 점포 수 대신 업종별 인허가·설비·수리비 중심으로 따로 검토하세요.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-800">
            업종 상이 주의
          </span>
        </div>
      )}

      {/* 필수 노출 배지 1 & 2 - 차분하고 읽기 편한 1줄 데이터 투명성 안내 */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-2.5 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            거주 배후인구 참고자료 (실제 유동인구 아님)
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-blue-800">
            <Layers className="h-3.5 w-3.5 text-blue-500" />
            상권 = 입력 주소 반경({radiusMeters}m) 기준 / 인구 = 선택 행정구역 단위 기준
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Info className="h-3.5 w-3.5 shrink-0" />
          소상공인시장진흥공단·행정안전부 구조 ({meta.commercialReferenceDate}) · 억지 순위/매출 예측 없음
        </span>
      </div>
    </section>
  );
}
