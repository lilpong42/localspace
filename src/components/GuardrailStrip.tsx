'use client';

import { AlertTriangle, Database, Info, Layers, Users } from 'lucide-react';
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
      aria-label="데이터 투명성 및 비교 오류 방지 가드레일"
      className="space-y-2.5"
    >
      {/* 필수 노출 배지 1 & 배지 2 + 데이터 출처/기준시점 상시 표기 */}
      <div className="rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* 배지 1 - 인구 성격 구분 */}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
            <Users className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span>거주 배후인구 참고자료 (실제 유동인구 아님)</span>
          </span>

          {/* 배지 2 - 조회 범위 차이 */}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200/80 bg-blue-50/70 px-2.5 py-1 text-xs font-medium text-blue-900">
            <Layers className="h-3.5 w-3.5 shrink-0 text-blue-600" />
            <span>
              상권 = 입력 주소 반경({radiusMeters}m) 기준 / 인구 = 선택 행정구역 단위 기준
            </span>
          </span>

          {/* 출처 및 기준시점 상시 표기 */}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100/80 px-2.5 py-1 text-[11px] text-slate-600">
            <Database className="h-3 w-3 shrink-0 text-slate-400" />
            <span>
              상권: 소상공인시장진흥공단 상가정보 구조({meta.commercialReferenceDate}) · 인구: 행정안전부 주민등록인구({meta.populationReferenceDate})
            </span>
          </span>
        </div>

        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>
            본 도구는 근거 없는 예상 매출액·창업 성공률 예측이나 100점 만점 억지 순위를 제공하지 않습니다. 설정한 예산·면적·업종 기준 충족 여부와 현장 재방문 검증 포인트를 투명하게 대조합니다.
          </span>
        </p>
      </div>

      {/* 필수 노출 배지 3 - 비교 오류 방지 경고 배너 (업종 상이 시 자동 표시) */}
      {industryMismatch && industryMismatchMessage && (
        <div
          id="industry-mismatch-banner"
          role="alert"
          className="flex flex-col gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 shadow-xs sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <div className="text-sm font-semibold text-amber-950">
                {industryMismatchMessage}
              </div>
              <p className="mt-0.5 text-xs text-amber-800">
                현재 <strong>후보 A({industryA})</strong>와{' '}
                <strong>후보 B({industryB})</strong>의 업종이 서로 다릅니다. 동종 점포 수·밀집도 단순 비교 대신 업종별 인허가·주방/배기 설비·초기 수리비 중심으로 분리 검토하세요.
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-md border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            비교 오류 방지 경고 작동 중
          </span>
        </div>
      )}
    </section>
  );
}
