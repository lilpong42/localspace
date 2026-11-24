'use client';

import dynamic from 'next/dynamic';
import { BarChart2, LayoutDashboard, Printer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AiVerificationPanel,
  type ChecklistProgressMap,
} from '@/components/AiVerificationPanel';
import { AppHeroBanner } from '@/components/AppHeroBanner';
import { CandidateComparisonBoard } from '@/components/CandidateComparisonBoard';
import { CandidateEditModal } from '@/components/CandidateEditModal';
import { CriteriaAndPresetBar } from '@/components/CriteriaAndPresetBar';
import { DataVerificationTab } from '@/components/DataVerificationTab';
import { GuardrailStrip } from '@/components/GuardrailStrip';
import { HannyangEmblem } from '@/components/HannyangEmblem';
import { PrintConsultationReport } from '@/components/PrintConsultationReport';
import { compareCandidates } from '@/lib/compareEngine';
import { PRESET_SCENARIOS } from '@/lib/presets';
import {
  autoMatchPairForCriteria,
  rankCatalogByCriteria,
  type MatchedCatalogItem,
} from '@/lib/propertyCatalog';
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
    <div className="flex h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
      지도를 불러오는 중입니다...
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
  const [editingSlot, setEditingSlot] = useState<'A' | 'B' | null>(null);

  const [aiResponse, setAiResponse] = useState<AiAnalyzeResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string>('');
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

  const comparison = useMemo(
    () => compareCandidates(candidateA, candidateB, criteria, stores, populations),
    [candidateA, candidateB, criteria, stores, populations]
  );

  const rankedCatalog = useMemo(
    () => rankCatalogByCriteria(criteria, stores, populations),
    [criteria, stores, populations]
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

  // 기준이나 후보 A/B가 바뀌면 450ms 디바운스 후 AI 분석도 자동 갱신 (비동기 콜백에서만 state 변경)
  useEffect(() => {
    let cancelled = false;
    const seq = ++requestSeqRef.current;

    const timer = window.setTimeout(() => {
      fetchAnalysis(criteria, candidateA, candidateB)
        .then((data) => {
          if (!cancelled && seq === requestSeqRef.current) {
            setAiResponse(data);
            setAiError(null);
          }
        })
        .catch(() => {
          if (!cancelled && seq === requestSeqRef.current) {
            setAiError(
              '분석 서버 호출 중 일시적 오류가 발생했습니다. 다시 시도해 주세요.'
            );
          }
        });
    }, 380);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [criteria, candidateA, candidateB, fetchAnalysis]);

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_SCENARIOS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setCriteria({ ...preset.criteria });
    setCandidateA({ ...preset.candidateA });
    setCandidateB({ ...preset.candidateB });
    setChecklistProgress(readStoredChecklist(`${STORAGE_PREFIX}${preset.id}`));
  };

  const handleChangeCriteria = (next: UserCriteria) => {
    setActivePresetId(null);
    setCriteria(next);
  };

  const handleAutoMatchByCriteria = () => {
    const matched = autoMatchPairForCriteria(criteria, stores, populations);
    setActivePresetId(null);
    setCandidateA(matched.candidateA);
    setCandidateB(matched.candidateB);
    setChecklistProgress(readStoredChecklist(`${STORAGE_PREFIX}custom`));
  };

  const handleApplyCatalogToSlot = (
    slot: 'A' | 'B',
    item: MatchedCatalogItem
  ) => {
    setActivePresetId(null);
    const nextCandidate: CandidateProperty = { ...item.listing, slot };
    if (slot === 'A') setCandidateA(nextCandidate);
    else setCandidateB(nextCandidate);
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

  const editingCandidate =
    editingSlot === 'A' ? candidateA : editingSlot === 'B' ? candidateB : null;

  return (
    <>
      <div className="no-print min-h-screen flex flex-col bg-[#F2F4F8]">
        {/* 슬림한 상단 내비게이션 바 (한냥 패밀리 룩) */}
        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
          <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <HannyangEmblem size={36} className="shrink-0" />
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-[#0F172A]">
                  한냥 <span className="font-bold text-[#92400E]">LocalSpace</span>
                </h1>
                <span className="inline-flex items-center rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-0.5 text-xs font-bold text-[#92400E]">
                  창업 공간 비교
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <nav
                className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1"
                aria-label="주요 화면 탭"
              >
                <button
                  id="tab-dashboard"
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition sm:text-sm ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  공간 비교
                </button>
                <button
                  id="tab-verification"
                  type="button"
                  onClick={() => setActiveTab('verification')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition sm:text-sm ${
                    activeTab === 'verification'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart2 className="h-4 w-4" />
                  차트 · 증빙 데이터
                </button>
              </nav>

              <button
                type="button"
                onClick={handlePrintReport}
                className="hidden items-center gap-1.5 rounded-xl bg-[#0B0F17] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800 md:inline-flex"
              >
                <Printer className="h-3.5 w-3.5" />
                리포트 인쇄
              </button>
            </div>
          </div>
        </header>

        {/* 메인 컨텐츠 */}
        <main className="mx-auto w-full max-w-[1220px] flex-1 space-y-6 px-4 py-6 sm:px-6">
          {/* 첫 화면 3초 이해 히어로 배너 + 지금 비교 중인 2곳 라이브 요약 */}
          <AppHeroBanner
            candidateA={candidateA}
            candidateB={candidateB}
            comparison={comparison}
            onStartCustomInput={() => setEditingSlot('A')}
            onJumpToCompare={() => {
              setActiveTab('dashboard');
              window.setTimeout(() => {
                document
                  .getElementById('compare-section')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 30);
            }}
          />

          {/* STEP 1: 내 창업 조건 설정 + 자동 매칭 + 매물 풀 + 프리셋 */}
          <CriteriaAndPresetBar
            activePresetId={activePresetId}
            criteria={criteria}
            candidateA={candidateA}
            candidateB={candidateB}
            comparison={comparison}
            rankedCatalog={rankedCatalog}
            onSelectPreset={handleSelectPreset}
            onChangeCriteria={handleChangeCriteria}
            onAutoMatchByCriteria={handleAutoMatchByCriteria}
            onApplyCatalogToSlot={handleApplyCatalogToSlot}
          />

          {/* 데이터 해석 안내 및 업종 상이 경고 */}
          <GuardrailStrip
            meta={meta}
            radiusMeters={criteria.radiusMeters}
            industryMismatch={comparison.industryMismatch}
            industryMismatchMessage={comparison.industryMismatchMessage}
            industryA={candidateA.industry}
            industryB={candidateB.industry}
          />

          {activeTab === 'dashboard' ? (
            <div id="compare-section" className="space-y-6 scroll-mt-20">
              {/* STEP 2: 후보 A vs B 한눈에 비교 카드 + 격차 비교표 */}
              <CandidateComparisonBoard
                criteria={criteria}
                candidateA={candidateA}
                candidateB={candidateB}
                comparison={comparison}
                onEditCandidate={setEditingSlot}
              />

              {/* 오픈소스 Leaflet 반경 지도 */}
              <ComparisonMap
                candidateA={candidateA}
                candidateB={candidateB}
                comparison={comparison}
                radiusMeters={criteria.radiusMeters}
              />

              {/* STEP 3: AI 핵심 요약 & 임대인 확인 체크리스트 */}
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
            </div>
          ) : (
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
        <footer className="mt-10 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:px-6">
            <div className="flex items-center gap-2">
              <HannyangEmblem size={20} />
              <span>
                <strong className="text-slate-800">한냥 LocalSpace</strong> · 제1회 동양AI빅데이터융합 아이디어 공모전 (팀명: 호날두의 아이들)
              </span>
            </div>
            <div>
              공공 상권({meta.totalCommercialRows}건) · 행정동 거주인구({meta.totalAdminDongs}개 구역) · 근거 없는 매출·순위 예측 배제
            </div>
          </div>
        </footer>
      </div>

      {/* 후보 A / B 조건·임장 메모 슬라이드 편집 드로어 */}
      {editingCandidate && (
        <CandidateEditModal
          candidate={editingCandidate}
          populations={populations}
          onChange={(next) => {
            setActivePresetId(null);
            if (editingSlot === 'A') setCandidateA(next);
            else if (editingSlot === 'B') setCandidateB(next);
          }}
          onClose={() => setEditingSlot(null)}
          onCloseAndReanalyze={() => {
            setEditingSlot(null);
            void runAnalysis(criteria, candidateA, candidateB);
          }}
        />
      )}

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
