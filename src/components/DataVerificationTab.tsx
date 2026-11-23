'use client';

import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import {
  BarChart3,
  Check,
  Code2,
  Copy,
  Download,
  FileSpreadsheet,
  Search,
  Table2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BUSINESS_CATEGORIES,
  type CandidateProperty,
  type ComparisonSummary,
  type DataSourceMeta,
  type StoreRecord,
} from '@/lib/types';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend
);

interface DataVerificationTabProps {
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
  stores: StoreRecord[];
  meta: DataSourceMeta;
  rScriptContent: string;
  dataCsvContent: string;
}

function exportHighDpiChartPng(
  chartCanvas: HTMLCanvasElement | null,
  filename: string,
  titleText: string,
  subtitleText: string,
  footerText: string
) {
  if (!chartCanvas) return;

  // Create a crisp 300DPI-grade white-background composite canvas for proposal insertion
  const scale = 2;
  const padX = 48 * scale;
  const headerH = 92 * scale;
  const footerH = 48 * scale;
  const chartW = Math.max(chartCanvas.width, 1100);
  const chartH = Math.round((chartCanvas.height / Math.max(chartCanvas.width, 1)) * chartW);

  const out = document.createElement('canvas');
  out.width = chartW + padX * 2;
  out.height = headerH + chartH + footerH;
  const ctx = out.getContext('2d');
  if (!ctx) return;

  // Solid white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);

  // Subtle top bar accent
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, out.width, 6 * scale);

  // Title & subtitle
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 ${20 * scale}px "Noto Sans KR", "Pretendard", sans-serif`;
  ctx.fillText(titleText, padX, 44 * scale);

  ctx.fillStyle = '#475569';
  ctx.font = `400 ${12 * scale}px "Noto Sans KR", "Pretendard", sans-serif`;
  ctx.fillText(subtitleText, padX, 70 * scale);

  // Draw chart
  ctx.drawImage(chartCanvas, padX, headerH, chartW, chartH);

  // Footer source notice
  ctx.fillStyle = '#64748b';
  ctx.font = `400 ${10.5 * scale}px "Noto Sans KR", "Pretendard", sans-serif`;
  ctx.fillText(footerText, padX, headerH + chartH + 28 * scale);

  const url = out.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function DataVerificationTab({
  candidateA,
  candidateB,
  comparison,
  stores,
  meta,
  rScriptContent,
  dataCsvContent,
}: DataVerificationTabProps) {
  const chart1Ref = useRef<HTMLCanvasElement | null>(null);
  const chart2Ref = useRef<HTMLCanvasElement | null>(null);
  const chart1Instance = useRef<Chart | null>(null);
  const chart2Instance = useRef<Chart | null>(null);

  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [dongFilter, setDongFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modal state
  const [modalArtifact, setModalArtifact] = useState<'r' | 'csv' | null>(null);
  const [copied, setCopied] = useState(false);

  const uniqueDongs = useMemo(() => {
    const set = new Set<string>();
    for (const s of stores) {
      set.add(`${s.sigungu} ${s.adminDong}`);
    }
    return Array.from(set).sort();
  }, [stores]);

  const filteredStores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stores.filter((s) => {
      if (categoryFilter !== 'ALL' && s.standardCategory !== categoryFilter) {
        return false;
      }
      if (dongFilter !== 'ALL' && `${s.sigungu} ${s.adminDong}` !== dongFilter) {
        return false;
      }
      if (q) {
        return (
          s.name.toLowerCase().includes(q) ||
          s.roadAddress.toLowerCase().includes(q) ||
          s.smallCategory.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stores, searchQuery, categoryFilter, dongFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStores.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedStores = filteredStores.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Chart 1: 반경 내 업종 분포 비교 막대그래프
  useEffect(() => {
    const canvas = chart1Ref.current;
    if (!canvas) return;
    chart1Instance.current?.destroy();

    const labels = [...BUSINESS_CATEGORIES];
    const dataA = labels.map((cat) => comparison.evalA.commercial.categoryCounts[cat] ?? 0);
    const dataB = labels.map((cat) => comparison.evalB.commercial.categoryCounts[cat] ?? 0);

    chart1Instance.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: `후보 A: ${candidateA.name}`,
            data: dataA,
            backgroundColor: '#2563eb',
            borderRadius: 6,
            maxBarThickness: 32,
          },
          {
            label: `후보 B: ${candidateB.name}`,
            data: dataB,
            backgroundColor: '#059669',
            borderRadius: 6,
            maxBarThickness: 32,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: 'bold' },
              color: '#334155',
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}개`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 2, color: '#64748b', font: { size: 11 } },
            grid: { color: '#f1f5f9' },
            title: {
              display: true,
              text: `반경 ${comparison.evalA.commercial.radiusMeters}m 점포 수 (개)`,
              color: '#475569',
              font: { size: 11 },
            },
          },
        },
      },
    });

    return () => {
      chart1Instance.current?.destroy();
    };
  }, [candidateA.name, candidateB.name, comparison]);

  // Chart 2: 평당 월 고정비 · 전용면적 · 동종 업종 밀집도 비교 차트
  useEffect(() => {
    const canvas = chart2Ref.current;
    if (!canvas) return;
    chart2Instance.current?.destroy();

    chart2Instance.current = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: [
          '평당 월 고정비 (만원/평)',
          '전용면적 (평)',
          `동종 업종 밀집도 (%, ${comparison.evalA.commercial.radiusMeters}m)`,
        ],
        datasets: [
          {
            label: `후보 A (${candidateA.industry})`,
            data: [
              comparison.evalA.costPerPyeong,
              candidateA.areaPyeong,
              comparison.evalA.commercial.sameIndustryDensityPct,
            ],
            backgroundColor: '#2563eb',
            borderRadius: 6,
            maxBarThickness: 38,
          },
          {
            label: `후보 B (${candidateB.industry})`,
            data: [
              comparison.evalB.costPerPyeong,
              candidateB.areaPyeong,
              comparison.evalB.commercial.sameIndustryDensityPct,
            ],
            backgroundColor: '#059669',
            borderRadius: 6,
            maxBarThickness: 38,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        devicePixelRatio: 2,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              boxWidth: 12,
              font: { size: 11, weight: 'bold' },
              color: '#334155',
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const idx = ctx.dataIndex;
                const unit = idx === 0 ? '만원/평' : idx === 1 ? '평' : '%';
                return `${ctx.dataset.label}: ${ctx.parsed.y}${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#334155', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#64748b', font: { size: 11 } },
            grid: { color: '#f1f5f9' },
            title: {
              display: true,
              text: '항목별 원단위 수치 (단위: 항목명 표기 참조)',
              color: '#475569',
              font: { size: 11 },
            },
          },
        },
      },
    });

    return () => {
      chart2Instance.current?.destroy();
    };
  }, [candidateA, candidateB, comparison]);

  const handleCopyModal = async () => {
    const text = modalArtifact === 'r' ? rScriptContent : dataCsvContent;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="데이터 검증, 고해상도 제안서 차트 및 증빙 자료">
      {/* 증빙 파일 열람/다운로드 바 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            공모전 제안서 증빙 데이터 & 재현 스크립트
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            정제 데이터(<code className="font-mono text-slate-700">public/data.csv</code>)와 제안서 그래프 300DPI 재현용 R 코드(<code className="font-mono text-slate-700">public/analysis.R</code>)를 웹에서 바로 검증·다운로드할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-r-modal"
            type="button"
            onClick={() => setModalArtifact('r')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Code2 className="h-3.5 w-3.5 text-blue-600" />
            analysis.R 코드 보기
          </button>
          <button
            id="btn-open-csv-modal"
            type="button"
            onClick={() => setModalArtifact('csv')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            data.csv 미리보기
          </button>
          <a
            href="/analysis.R"
            download="analysis.R"
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            analysis.R 다운로드
          </a>
          <a
            href="/data.csv"
            download="data.csv"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-900 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            <Download className="h-3.5 w-3.5" />
            data.csv 다운로드
          </a>
        </div>
      </div>

      {/* 제안서 삽입용 고해상도 차트 2종 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 차트 1 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  1. 후보 A vs B 반경({comparison.evalA.commercial.radiusMeters}m) 업종 분포 비교
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                입력 좌표 반경 기준 소상공인시장진흥공단 상가정보 분류 집계
              </p>
            </div>
            <button
              id="btn-download-chart1"
              type="button"
              onClick={() =>
                exportHighDpiChartPng(
                  chart1Ref.current,
                  `localspace_chart1_industry_${comparison.evalA.commercial.radiusMeters}m.png`,
                  `후보 A vs 후보 B 반경 ${comparison.evalA.commercial.radiusMeters}m 업종 분포 비교`,
                  `후보 A: ${candidateA.name} (${candidateA.industry})  |  후보 B: ${candidateB.name} (${candidateB.industry})`,
                  `출처: ${meta.commercialSource} (${meta.commercialReferenceDate}) · 상권=반경 기준 / 인구=행정구역 단위 기준 · LocalSpace`
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5" />
              고해상도 PNG (2x)
            </button>
          </div>
          <div className="h-[290px] w-full">
            <canvas ref={chart1Ref} />
          </div>
        </div>

        {/* 차트 2 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  2. 평당 월 고정비 · 전용면적 · 동종 업종 밀집도 비교
                </h3>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                임의 총점 없이 3대 정량 핵심 지표를 원단위 그대로 병렬 대조
              </p>
            </div>
            <button
              id="btn-download-chart2"
              type="button"
              onClick={() =>
                exportHighDpiChartPng(
                  chart2Ref.current,
                  `localspace_chart2_metrics_${comparison.evalA.commercial.radiusMeters}m.png`,
                  '후보 A vs 후보 B 평당 월 고정비 · 전용면적 · 동종 밀집도 비교',
                  `후보 A: ${candidateA.name} (${candidateA.industry})  |  후보 B: ${candidateB.name} (${candidateB.industry})`,
                  comparison.industryMismatch
                    ? '주의: 비교 업종이 서로 다릅니다. 단순 점포 수·밀집도만으로 유불리를 판단하지 마세요 · LocalSpace'
                    : `출처: 입력 실매물 조건 + ${meta.commercialSource} (${meta.commercialReferenceDate}) · LocalSpace`
                )
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <Download className="h-3.5 w-3.5" />
              고해상도 PNG (2x)
            </button>
          </div>
          <div className="h-[290px] w-full">
            <canvas ref={chart2Ref} />
          </div>
        </div>
      </div>

      {/* 원본 샘플 상가 데이터 테이블 미리보기 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Table2 className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              원본 샘플 상가 데이터 미리보기 (commercial_sample.csv)
            </h3>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600">
              검색 결과 {filteredStores.length.toLocaleString()} / 전체 {stores.length.toLocaleString()}건
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="상호명·도로명 주소 검색"
                className="h-8 w-48 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              aria-label="업종 필터"
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 업종군</option>
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={dongFilter}
              onChange={(e) => {
                setDongFilter(e.target.value);
                setPage(1);
              }}
              aria-label="행정동 필터"
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="ALL">전체 행정동</option>
              {uniqueDongs.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-600">
              <tr className="border-b border-slate-200">
                <th className="px-3 py-2.5">상가업소번호</th>
                <th className="px-3 py-2.5">상호명</th>
                <th className="px-3 py-2.5">업종군</th>
                <th className="px-3 py-2.5">세부 업종</th>
                <th className="px-3 py-2.5">행정동</th>
                <th className="px-3 py-2.5">도로명 주소</th>
                <th className="px-3 py-2.5 text-right">좌표 (위도, 경도)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pagedStores.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                    {row.id}
                  </td>
                  <td className="px-3 py-2 font-medium text-slate-900">
                    {row.name}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">
                      {row.standardCategory}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{row.smallCategory}</td>
                  <td className="px-3 py-2">
                    {row.sigungu} {row.adminDong}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{row.roadAddress}</td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] tabular-nums text-slate-500">
                    {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
                  </td>
                </tr>
              ))}
              {pagedStores.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                    검색 조건에 해당하는 점포 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span className="tabular-nums">
            페이지 {safePage} / {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              이전
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        </div>
      </div>

      {/* 증빙 파일 열람 모달 */}
      {modalArtifact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="증빙 파일 열람 모달"
        >
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {modalArtifact === 'r'
                    ? 'public/analysis.R — 제안서 그래프 재현용 R 분석 스크립트'
                    : 'public/data.csv — 제안서 증빙 정제 데이터셋'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  제1회 동양AI빅데이터융합 아이디어 공모전 증빙 산출물
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      복사
                    </>
                  )}
                </button>
                <a
                  href={modalArtifact === 'r' ? '/analysis.R' : '/data.csv'}
                  download={modalArtifact === 'r' ? 'analysis.R' : 'data.csv'}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  다운로드
                </a>
                <button
                  type="button"
                  onClick={() => setModalArtifact(null)}
                  aria-label="모달 닫기"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4">
              <pre className="font-mono text-[11.5px] leading-relaxed text-slate-100">
                {modalArtifact === 'r' ? rScriptContent : dataCsvContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
