'use client';

import dynamic from 'next/dynamic';
import {
  BarChart2,
  Bookmark,
  Bot,
  Map as MapIcon,
  Printer,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AiVerificationPanel,
  type ChecklistProgressMap,
  getChecklistItemKey,
} from '@/components/AiVerificationPanel';
import { CandidateEditModal } from '@/components/CandidateEditModal';
import type { MapFocusRequest } from '@/components/ComparisonMap';
import { DataVerificationTab } from '@/components/DataVerificationTab';
import { GuardrailStrip } from '@/components/GuardrailStrip';
import { HannyangEmblem } from '@/components/HannyangEmblem';
import { PrintConsultationReport } from '@/components/PrintConsultationReport';
import {
  SavedComparisonsDrawer,
  type SavedComparisonRecord,
} from '@/components/SavedComparisonsDrawer';
import { WorkspaceView } from '@/components/WorkspaceView';
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
    <div className="flex h-full min-h-[460px] items-center justify-center bg-slate-100 text-sm font-medium text-slate-500">
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

type ActiveTab = 'workspace' | 'ai' | 'data';

const CHECKLIST_STORAGE_PREFIX = 'localspace_checklist_v1_';
const SAVED_COMPARISONS_KEY = 'localspace_saved_comparisons_v1';

export function LocalSpaceApp({
  stores,
  populations,
  meta,
  rScriptContent,
  dataCsvContent,
}: LocalSpaceAppProps) {
  const initialPreset = PRESET_SCENARIOS[0];

  const [activeTab, setActiveTab] = useState<ActiveTab>('workspace');
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
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [focusRequest, setFocusRequest] = useState<MapFocusRequest | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [aiResponse, setAiResponse] = useState<AiAnalyzeResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<string>('');

  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgressMap>(
    () => {
      if (typeof window === 'undefined') return {};
      try {
        const saved = window.localStorage.getItem(
          `${CHECKLIST_STORAGE_PREFIX}${initialPreset.id}`
        );
        return saved ? (JSON.parse(saved) as ChecklistProgressMap) : {};
      } catch {
        return {};
      }
    }
  );

  const [savedRecords, setSavedRecords] = useState<SavedComparisonRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(SAVED_COMPARISONS_KEY);
      return raw ? (JSON.parse(raw) as SavedComparisonRecord[]) : [];
    } catch {
      return [];
    }
  });

  const requestSeqRef = useRef(0);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const comparison = useMemo(
    () => compareCandidates(candidateA, candidateB, criteria, stores, populations),
    [candidateA, candidateB, criteria, stores, populations]
  );

  const rankedCatalog = useMemo(
    () => rankCatalogByCriteria(criteria, stores, populations),
    [criteria, stores, populations]
  );

  const storageKey = `${CHECKLIST_STORAGE_PREFIX}${activePresetId ?? 'custom'}`;

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
        // Ignore quota errors
      }
    },
    [storageKey]
  );

  const persistSavedRecords = useCallback((next: SavedComparisonRecord[]) => {
    setSavedRecords(next);
    try {
      window.localStorage.setItem(SAVED_COMPARISONS_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota errors
    }
  }, []);

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        if (seq === requestSeqRef.current) setAiResponse(data);
      } catch {
        if (seq === requestSeqRef.current) {
          setAiError('분석 서버 호출 중 일시적 오류가 발생했습니다. 다시 시도해 주세요.');
        }
      } finally {
        if (seq === requestSeqRef.current) setAiLoading(false);
      }
    },
    [fetchAnalysis]
  );

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
            setAiError('분석 서버 호출 중 일시적 오류가 발생했습니다.');
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
    setChecklistProgress(readStoredChecklist(`${CHECKLIST_STORAGE_PREFIX}${preset.id}`));
    showToast(`${preset.shortLabel} · ${preset.title} 시나리오를 불러왔습니다`);
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
    setChecklistProgress(readStoredChecklist(`${CHECKLIST_STORAGE_PREFIX}custom`));
    showToast(`내 조건(${criteria.targetIndustry})에 맞는 후보 A·B 2곳을 자동 매칭했습니다`);
  };

  const handleApplyCatalogToSlot = (slot: 'A' | 'B', item: MatchedCatalogItem) => {
    setActivePresetId(null);
    const nextCandidate: CandidateProperty = { ...item.listing, slot };
    if (slot === 'A') setCandidateA(nextCandidate);
    else setCandidateB(nextCandidate);
    showToast(`후보 ${slot}를 [${item.listing.name}]으로 교체했습니다`);
  };

  const handleSwapCandidates = () => {
    setActivePresetId(null);
    setCandidateA({ ...candidateB, slot: 'A' });
    setCandidateB({ ...candidateA, slot: 'B' });
    showToast('후보 A와 후보 B를 맞바꾸었습니다');
  };

  const handlePickCoordinate = (
    slot: 'A' | 'B',
    lat: number,
    lng: number,
    address?: string,
    adminDongKey?: string
  ) => {
    setActivePresetId(null);
    const updater = (prev: CandidateProperty): CandidateProperty => ({
      ...prev,
      lat,
      lng,
      address: address ?? `지도 직접 지정 (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
      adminDongKey: adminDongKey ?? prev.adminDongKey,
    });
    if (slot === 'A') setCandidateA(updater);
    else setCandidateB(updater);
    showToast(`지도에서 후보 ${slot} 위치를 이동하고 반경 상권을 재집계했습니다`);
  };

  const handleFocusMap = (slot: MapFocusRequest['slot']) => {
    setFocusRequest({ slot, nonce: Date.now() });
  };

  const handleSaveComparison = (title: string) => {
    const newRec: SavedComparisonRecord = {
      id: `cmp_${Date.now()}`,
      title,
      savedAt: new Date().toLocaleString('ko-KR', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      criteria: { ...criteria },
      candidateA: { ...candidateA },
      candidateB: { ...candidateB },
    };
    persistSavedRecords([newRec, ...savedRecords].slice(0, 15));
    showToast(`내 비교함에 "${title}" 저장 완료`);
  };

  const handleLoadComparison = (rec: SavedComparisonRecord) => {
    setActivePresetId(null);
    setCriteria({ ...rec.criteria });
    setCandidateA({ ...rec.candidateA });
    setCandidateB({ ...rec.candidateB });
    setActiveTab('workspace');
    showToast(`"${rec.title}" 비교 세트를 불러왔습니다`);
  };

  const handleDeleteComparison = (id: string) => {
    persistSavedRecords(savedRecords.filter((r) => r.id !== id));
    showToast('저장된 비교를 삭제했습니다');
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

  const checklistItems = aiResponse?.analysis.landlord_checklist ?? [];
  const checkedCount = checklistItems.filter(
    (item, idx) => checklistProgress[getChecklistItemKey(idx, item.question)]?.checked
  ).length;

  return (
    <>
      <div className="no-print flex min-h-screen flex-col bg-[#F2F4F8]">
        {/* 슬림한 네이티브 앱 상단 바 (56px) */}
        <header className="sticky top-0 z-30 h-[57px] border-b border-slate-200/90 bg-white/95 backdrop-blur-xs">
          <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between gap-3 px-4">
            {/* 브랜드 */}
            <div className="flex items-center gap-2.5">
              <HannyangEmblem size={32} className="shrink-0" />
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-[#0F172A] sm:text-[17px]">
                  한냥 <span className="font-bold text-[#92400E]">LocalSpace</span>
                </h1>
                <span className="hidden rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-bold text-[#92400E] sm:inline-flex">
                  창업 공간 비교
                </span>
              </div>
            </div>

            {/* 중앙 앱 화면 전환 탭 (데스크톱) */}
            <nav
              className="hidden items-center rounded-xl border border-slate-200 bg-slate-100 p-1 md:inline-flex"
              aria-label="앱 주요 화면 전환"
            >
              <button
                id="tab-workspace"
                type="button"
                onClick={() => setActiveTab('workspace')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'workspace'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="h-3.5 w-3.5" />
                지도 · 비교
              </button>
              <button
                id="tab-ai"
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'ai'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="h-3.5 w-3.5" />
                AI · 임장노트
                {checklistItems.length > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-extrabold tabular-nums text-[#92400E]">
                    {checkedCount}/{checklistItems.length}
                  </span>
                )}
              </button>
              <button
                id="tab-data"
                type="button"
                onClick={() => setActiveTab('data')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                  activeTab === 'data'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                차트 · 데이터
              </button>
            </nav>

            {/* 우측 앱 액션 */}
            <div className="flex items-center gap-2">
              <button
                id="btn-open-saved"
                type="button"
                onClick={() => setShowSavedDrawer(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#92400E]" />
                <span>비교함</span>
                {savedRecords.length > 0 && (
                  <span className="rounded-full bg-[#0B0F17] px-1.5 text-[10px] font-bold text-amber-300">
                    {savedRecords.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0B0F17] px-3 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">A4 리포트</span>
              </button>
            </div>
          </div>
        </header>

        {/* 메인 앱 콘텐츠 영역 */}
        {activeTab === 'workspace' && (
          <WorkspaceView
            activePresetId={activePresetId}
            criteria={criteria}
            candidateA={candidateA}
            candidateB={candidateB}
            comparison={comparison}
            rankedCatalog={rankedCatalog}
            aiResponse={aiResponse}
            aiLoading={aiLoading}
            meta={meta}
            onSelectPreset={handleSelectPreset}
            onChangeCriteria={handleChangeCriteria}
            onAutoMatchByCriteria={handleAutoMatchByCriteria}
            onApplyCatalogToSlot={handleApplyCatalogToSlot}
            onSwapCandidates={handleSwapCandidates}
            onEditCandidate={setEditingSlot}
            onFocusMap={handleFocusMap}
            onOpenAiTab={() => setActiveTab('ai')}
            mapSlot={
              <ComparisonMap
                candidateA={candidateA}
                candidateB={candidateB}
                comparison={comparison}
                radiusMeters={criteria.radiusMeters}
                populations={populations}
                focusRequest={focusRequest}
                onChangeRadius={(r) =>
                  handleChangeCriteria({ ...criteria, radiusMeters: r })
                }
                onPickCoordinate={handlePickCoordinate}
              />
            }
          />
        )}

        {activeTab === 'ai' && (
          <main className="mx-auto w-full max-w-[1080px] flex-1 space-y-4 px-4 py-5 pb-24 sm:px-6 md:pb-8">
            <GuardrailStrip
              meta={meta}
              radiusMeters={criteria.radiusMeters}
              industryMismatch={comparison.industryMismatch}
              industryMismatchMessage={comparison.industryMismatchMessage}
              industryA={candidateA.industry}
              industryB={candidateB.industry}
            />
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
          </main>
        )}

        {activeTab === 'data' && (
          <main className="mx-auto w-full max-w-[1220px] flex-1 space-y-4 px-4 py-5 pb-24 sm:px-6 md:pb-8">
            <GuardrailStrip
              meta={meta}
              radiusMeters={criteria.radiusMeters}
              industryMismatch={comparison.industryMismatch}
              industryMismatchMessage={comparison.industryMismatchMessage}
              industryA={candidateA.industry}
              industryB={candidateB.industry}
            />
            <DataVerificationTab
              candidateA={candidateA}
              candidateB={candidateB}
              comparison={comparison}
              stores={stores}
              meta={meta}
              rScriptContent={rScriptContent}
              dataCsvContent={dataCsvContent}
            />
          </main>
        )}

        {/* 모바일 네이티브 하단 탭 바 */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur-xs md:hidden"
          aria-label="모바일 하단 앱 탭"
        >
          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
              activeTab === 'workspace' ? 'text-[#0B0F17]' : 'text-slate-400'
            }`}
          >
            <MapIcon className="h-4.5 w-4.5" />
            지도·비교
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
              activeTab === 'ai' ? 'text-[#0B0F17]' : 'text-slate-400'
            }`}
          >
            <Bot className="h-4.5 w-4.5" />
            AI·임장 ({checkedCount}/{checklistItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${
              activeTab === 'data' ? 'text-[#0B0F17]' : 'text-slate-400'
            }`}
          >
            <BarChart2 className="h-4.5 w-4.5" />
            차트·데이터
          </button>
          <button
            type="button"
            onClick={() => setShowSavedDrawer(true)}
            className="flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-slate-500"
          >
            <Bookmark className="h-4.5 w-4.5 text-[#92400E]" />
            비교함 ({savedRecords.length})
          </button>
        </nav>

        {/* 실시간 앱 토스트 피드백 */}
        {toastMsg && (
          <div
            role="status"
            className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 md:bottom-6"
          >
            <div className="rounded-full bg-[#0B0F17] px-4 py-2.5 text-xs font-bold text-white shadow-xl">
              {toastMsg}
            </div>
          </div>
        )}
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
            showToast('수정된 조건으로 AI 비교를 갱신했습니다');
          }}
        />
      )}

      {/* 내 비교함 (저장/불러오기) 슬라이드 드로어 */}
      {showSavedDrawer && (
        <SavedComparisonsDrawer
          records={savedRecords}
          currentA={candidateA}
          currentB={candidateB}
          onSaveCurrent={handleSaveComparison}
          onLoadRecord={handleLoadComparison}
          onDeleteRecord={handleDeleteComparison}
          onClose={() => setShowSavedDrawer(false)}
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
