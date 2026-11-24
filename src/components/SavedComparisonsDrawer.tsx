'use client';

import { Bookmark, FolderOpen, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { CandidateProperty, UserCriteria } from '@/lib/types';

export interface SavedComparisonRecord {
  id: string;
  title: string;
  savedAt: string;
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
}

interface SavedComparisonsDrawerProps {
  records: SavedComparisonRecord[];
  currentA: CandidateProperty;
  currentB: CandidateProperty;
  onSaveCurrent: (title: string) => void;
  onLoadRecord: (record: SavedComparisonRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClose: () => void;
}

export function SavedComparisonsDrawer({
  records,
  currentA,
  currentB,
  onSaveCurrent,
  onLoadRecord,
  onDeleteRecord,
  onClose,
}: SavedComparisonsDrawerProps) {
  const defaultTitle = `${currentA.industry} 비교 · ${currentA.name.slice(0, 10)} vs ${currentB.name.slice(0, 10)}`;
  const [title, setTitle] = useState(defaultTitle);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = title.trim() || defaultTitle;
    onSaveCurrent(cleaned);
    setTitle('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="내 비교함"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
              <Bookmark className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">내 비교함</h2>
              <p className="text-xs text-slate-500">
                현재 비교 중인 후보 A·B 세트를 저장하고 언제든 다시 불러옵니다
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="비교함 닫기"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 현재 비교 저장 폼 */}
        <form
          onSubmit={handleSave}
          className="border-b border-slate-100 bg-slate-50/80 p-5 space-y-2.5"
        >
          <label className="block text-xs font-bold text-slate-700">
            현재 비교 세트 저장하기
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 영주 카페 최종 후보 2곳"
              className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-[#0B0F17] px-3.5 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              저장
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            A: {currentA.name} / B: {currentB.name}
          </p>
        </form>

        {/* 저장 목록 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-14 text-center">
              <FolderOpen className="h-8 w-8 text-slate-300" />
              <div className="mt-2.5 text-sm font-bold text-slate-700">
                아직 저장된 비교가 없습니다
              </div>
              <p className="mt-1 text-xs text-slate-400">
                위에서 현재 비교 중인 후보 A·B를 저장해 두면 클릭 한 번으로 다시 열 수 있습니다.
              </p>
            </div>
          ) : (
            records.map((rec) => (
              <div
                key={rec.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">
                      {rec.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {rec.savedAt} · 기준 {rec.criteria.targetIndustry} · 반경{' '}
                      {rec.criteria.radiusMeters}m
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRecord(rec.id)}
                    aria-label="삭제"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="truncate">
                    <span className="font-bold text-blue-600">A</span>{' '}
                    {rec.candidateA.name} ({rec.candidateA.monthlyRent}만 /{' '}
                    {rec.candidateA.areaPyeong}평)
                  </div>
                  <div className="truncate">
                    <span className="font-bold text-emerald-600">B</span>{' '}
                    {rec.candidateB.name} ({rec.candidateB.monthlyRent}만 /{' '}
                    {rec.candidateB.areaPyeong}평)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onLoadRecord(rec);
                    onClose();
                  }}
                  className="mt-3 w-full rounded-lg bg-slate-100 py-2 text-xs font-bold text-slate-800 transition hover:bg-slate-200"
                >
                  이 비교 불러오기
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
