'use client';

import dynamic from 'next/dynamic';
import { BarChart2, LayoutDashboard, Printer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AiVerificationPanel,
  type ChecklistProgressMap,
} from '@/components/AiVerificationPanel';
import { CandidateComparisonBoard } from '@/components/CandidateComparisonBoard';
import { CriteriaAndPresetBar } from '@/components/CriteriaAndPresetBar';
import { DataVerificationTab } from '@/components/DataVerificationTab';
import { GuardrailStrip } from '@/components/GuardrailStrip';
import { HannyangEmblem } from '@/components/HannyangEmblem';
import { PrintConsultationReport } from '@/components/PrintConsultationReport';
import { compareCandidates } from '@/lib/compareEngine';
import { PRESET_SCENARIOS } from '@/lib/presets';
import type {
  AiAnalyzeResponse,
  CandidateProperty,
  DataSourceMeta,
  PopulationRecord,
  StoreRecord,
  UserCriteria,
} from '@/lib/types';

const ComparisonMap = dynamic(() => import('@/components/ComparisonMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-slate-200 bg-white text-xs text-slate-500">
      오픈소스 Leaflet 지도를 불러오는 중입니다...
    </div>
  ),
});

interface LocalSpaceAppProps {
  stores: StoreRecord[];
  populations: PopulationRecord[];
  meta: DataSourceMeta;
  rScriptContent: string;
  dataCsvContent: string;
}

type ActiveTab = 'dashboard' | 'verification';

const STORAGE_PREFIX = 'localspace_checklist_v1_';

export function LocalSpaceApp({
  stores,
  populations,
  meta,
  rScriptContent,
  dataCsvContent,
}: LocalSpaceAppProps) {
  const initialPreset = PRESET_SCENARIOS[0];

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activePresetId, setActivePresetId] = useState<string | null>(
    initialPreset.id
  );
  const [criteria, setCriteria] = useState<UserCriteria>(initialPreset.criteria);
  const [candidateA, setCandidateA] = useState<CandidateProperty>(
    initialPreset.candidateA
  );
  const [candidateB, setCandidateB] = useState<CandidateProperty>(
    initialPreset.candidateB
  );

  const [aiResponse, setAiResponse] = useState<AiAnalyzeResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgressMap>(
    () => {
      if (typeof window === 'undefined') return {};
      try {
        const saved = window.localStorage.getItem(
          `${STORAGE_PREFIX}${initialPreset.id}`
        );
        return saved ? (JSON.parse(saved) as ChecklistProgressMap) : {};
      } catch {
        return {};
      }
    }
  );

  const requestSeqRef = useRef(0);

  // 정량 비교 엔진 실시간 산출
  const comparison = useMemo(
    () => compareCandidates(candidateA, candidateB, criteria, stores, populations),
    [candidateA, candidateB, criteria, stores, populations]
  );

  const storageKey = `${STORAGE_PREFIX}${activePresetId ?? 'custom'}`;

  const readStoredChecklist = useCallback((key: string): ChecklistProgressMap => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = window.localStorage.getItem(key);
      return saved ? (JSON.parse(saved) as ChecklistProgressMap) : {};
    } catch {
      return {};
    }
  }, []);

  const persistChecklist = useCallback(
    (next: ChecklistProgressMap) => {
      setChecklistProgress(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
    },
    [storageKey]
  );

  const fetchAnalysis = useCallback(
    async (
      nextCriteria: UserCriteria,
      nextA: CandidateProperty,
      nextB: CandidateProperty
    ): Promise<AiAnalyzeResponse> => {
      const comp = compareCandidates(nextA, nextB, nextCriteria, stores, populations);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: nextCriteria,
          candidateA: nextA,
          candidateB: nextB,
          comparison: comp,
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return (await res.json()) as AiAnalyzeResponse;
    },
    [stores, populations]
  );

  const runAnalysis = useCallback(
    async (
      nextCriteria: UserCriteria,
      nextA: CandidateProperty,
      nextB: CandidateProperty
    ) => {
      const seq = ++requestSeqRef.current;
      setAiLoading(true);
      setAiError(null);

      try {
        const data = await fetchAnalysis(nextCriteria, nextA, nextB);
        if (seq === requestSeqRef.current) {
          setAiResponse(data);
        }
      } catch {
        if (seq === requestSeqRef.current) {
          setAiError(
            '분석 서버 호출 중 일시적 오류가 발생했습니다. 다시 시도해 주세요.'
          );
        }
      } finally {
        if (seq === requestSeqRef.current) {
          setAiLoading(false);
        }
      }
    },
    [fetchAnalysis]
  );

  // 최초 진입 시 기본 프리셋 1회 분석 자동 실행 (비동기 콜백에서만 state 갱신)
  useEffect(() => {
    let cancelled = false;
    const seq = ++requestSeqRef.current;
    fetchAnalysis(
      initialPreset.criteria,
      initialPreset.candidateA,
      initialPreset.candidateB
    )
      .then((data) => {
        if (!cancelled && seq === requestSeqRef.current) {
          setAiResponse(data);
          setAiError(null);
        }
      })
      .catch(() => {
        if (!cancelled && seq === requestSeqRef.current) {
          setAiError(
            '초기 분석 서버 호출 중 일시적 오류가 발생했습니다. 다시 시도해 주세요.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchAnalysis, initialPreset]);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setCriteria({ ...preset.criteria });
    setCandidateA({ ...preset.candidateA });
    setCandidateB({ ...preset.candidateB });
    setChecklistProgress(readStoredChecklist(`${STORAGE_PREFIX}${preset.id}`));
    void runAnalysis(preset.criteria, preset.candidateA, preset.candidateB);
  };

  const handleResetCurrentPreset = () => {
    if (!activePresetId) return;
    handleSelectPreset(activePresetId);
  };

  const handleToggleCheck = (itemKey: string) => {
    const prev = checklistProgress[itemKey] ?? { checked: false, answerMemo: '' };
    persistChecklist({
      ...checklistProgress,
      [itemKey]: { ...prev, checked: !prev.checked },
    });
  };

  const handleChangeAnswerMemo = (itemKey: string, answerMemo: string) => {
    const prev = checklistProgress[itemKey] ?? { checked: false, answerMemo: '' };
    persistChecklist({
      ...checklistProgress,
      [itemKey]: { ...prev, answerMemo },
    });
  };

  const [printedAt, setPrintedAt] = useState<string>('');

  const handlePrintReport = () => {
    setPrintedAt(
      new Date().toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    );
    window.setTimeout(() => window.print(), 30);
  };

  return (
    <>
      <div className="no-print min-h-screen flex flex-col bg-[#F2F4F8]">
        {/* 상단 정밀 내비게이션 바 (한냥 Studio · 한냥 AirGuard 패밀리 룩: 한냥 엽전 로고 + 2대 뷰 탭) */}
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                <HannyangEmblem size={36} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[17px] font-extrabold tracking-tight text-[#0F172A]">
                    한냥 <span className="font-bold text-[#92400E]">LocalSpace</span>
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-[11px] font-bold text-[#92400E]">
                    창업 공간 비교
                  </span>
                  <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 lg:inline-block">
                    제1회 동양AI빅데이터융합 공모전 · 팀 호날두의 아이들
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  공공데이터와 실매물 조건·현장 메모를 연결한 예비 창업자 맞춤형 공간 비교 AI 플랫폼
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 탭 전환 */}
              <nav
                className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
                aria-label="주요 화면 탭"
              >
                <button
                  id="tab-dashboard"
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  공간 비교 대시보드
                </button>
                <button
                  id="tab-verification"
                  type="button"
                  onClick={() => setActiveTab('verification')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === 'verification'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  데이터 검증 & 차트
                </button>
              </nav>

              <button
                type="button"
                onClick={handlePrintReport}
                className="hidden items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 md:inline-flex"
              >
                <Printer className="h-3.5 w-3.5" />
                상담 리포트 인쇄
              </button>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-4 px-4 py-5 sm:px-6">
          {/* 상시 노출 프리셋 + 창업 기준 */}
          <CriteriaAndPresetBar
            activePresetId={activePresetId}
            criteria={criteria}
            onSelectPreset={handleSelectPreset}
            onChangeCriteria={setCriteria}
            onResetCurrentPreset={handleResetCurrentPreset}
          />

          {/* 필수 노출 3종 가드레일 배지 */}
          <GuardrailStrip
            meta={meta}
            radiusMeters={criteria.radiusMeters}
            industryMismatch={comparison.industryMismatch}
            industryMismatchMessage={comparison.industryMismatchMessage}
            industryA={candidateA.industry}
            industryB={candidateB.industry}
          />

          {activeTab === 'dashboard' ? (
            <>
              {/* 모듈 B + C: 후보 A vs 후보 B 병렬 비교 보드 */}
              <CandidateComparisonBoard
                candidateA={candidateA}
                candidateB={candidateB}
                comparison={comparison}
                populations={populations}
                onChangeA={setCandidateA}
                onChangeB={setCandidateB}
              />

              {/* 모듈 B: 오픈소스 Leaflet 반경 지도 */}
              <ComparisonMap
                candidateA={candidateA}
                candidateB={candidateB}
                comparison={comparison}
                radiusMeters={criteria.radiusMeters}
              />

              {/* 모듈 D: 근거 기반 AI 비교·검증 & 체크리스트 */}
              <AiVerificationPanel
                response={aiResponse}
                loading={aiLoading}
                error={aiError}
                checklistProgress={checklistProgress}
                onToggleCheck={handleToggleCheck}
                onChangeAnswerMemo={handleChangeAnswerMemo}
                onReanalyze={() => void runAnalysis(criteria, candidateA, candidateB)}
                onPrintReport={handlePrintReport}
              />
            </>
          ) : (
            /* 모듈 E: 데이터 검증·고해상도 차트·원본 데이터 표·analysis.R 모달 */
            <DataVerificationTab
              candidateA={candidateA}
              candidateB={candidateB}
              comparison={comparison}
              stores={stores}
              meta={meta}
              rScriptContent={rScriptContent}
              dataCsvContent={dataCsvContent}
            />
          )}
        </main>

        {/* 푸터 */}
        <footer className="mt-8 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[11px] text-slate-500 sm:px-6">
            <div className="flex items-center gap-2">
              <HannyangEmblem size={18} />
              <span>
                <strong className="text-slate-800">한냥 LocalSpace</strong> (Hannyang 시리즈) · 제1회 동양AI빅데이터융합 아이디어 공모전 출품 프로토타입 (팀명: 호날두의 아이들)
              </span>
            </div>
            <div>
              근거 없는 매출·성공률 예측 배제 · 공공 상권({meta.totalCommercialRows}건 샘플 인덱스) & 행정동 거주인구({meta.totalAdminDongs}개 구역)
            </div>
          </div>
        </footer>
      </div>

      {/* A4 인쇄/PDF 저장 전용 상담 리포트 뷰 */}
      <PrintConsultationReport
        criteria={criteria}
        candidateA={candidateA}
        candidateB={candidateB}
        comparison={comparison}
        aiResponse={aiResponse}
        checklistProgress={checklistProgress}
        meta={meta}
        printedAt={printedAt}
      />
    </>
  );
}
