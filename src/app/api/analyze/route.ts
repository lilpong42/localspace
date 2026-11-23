import { NextResponse } from 'next/server';
import { buildFallbackAnalysis } from '@/lib/fallbackAnalyzer';
import type {
  AiAnalysisResult,
  AiAnalyzeResponse,
  CandidateProperty,
  ComparisonSummary,
  LandlordChecklistItem,
  UserCriteria,
} from '@/lib/types';

interface AnalyzeRequestBody {
  criteria: UserCriteria;
  candidateA: CandidateProperty;
  candidateB: CandidateProperty;
  comparison: ComparisonSummary;
}

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `당신은 예비 창업자 및 지자체·대학 창업상담 멘토를 지원하는 공간 비교 검증 어시스턴트 '로컬스페이스(LocalSpace)'입니다.

[필수 준수 원칙 — 절대 위반 금지]
1. 예상 매출액, 월 순수익, 손익분기점(BEP), 창업 성공 확률, 기대 수익률 등 근거 없는 수치 예측을 절대 생성하지 마세요.
2. 100점 만점 총점, 1등/2등 순위, "무조건 A가 더 좋다"와 같은 단정적 결론을 내리지 마세요.
3. 오직 사용자가 전달한 정량 진단 수치, 공공데이터 요약(상권=반경 기준, 인구=행정동 거주 배후인구 참고자료이며 실제 유동인구 아님), 현장 방문 메모에만 근거해 한국어로 간결하고 실무적으로 분석하세요.
4. 비교 업종이 서로 다를 경우(industryMismatch=true), 단순 점포 수나 밀집도만으로 유불리를 판단하지 말라는 주의사항과 업종별 설비·인허가 분리 검토 필요성을 반드시 포함하세요.
5. 반드시 지정된 JSON 스키마만 출력하세요. 마크다운 코드블록이나 추가 해설 텍스트를 붙이지 마세요.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    tradeoff_summary: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '후보 A와 B의 비용·면적·초기자금·상권 핵심 트레이드오프 차이 요약 3개',
    },
    candidate_a_risks: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '후보 A의 정량 수치·현장 메모 기반 확인 필요 리스크 목록 (2~4개)',
    },
    candidate_b_risks: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: '후보 B의 정량 수치·현장 메모 기반 확인 필요 리스크 목록 (2~4개)',
    },
    landlord_checklist: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          target: {
            type: 'STRING',
            enum: ['공통', '후보 A', '후보 B'],
          },
          category: {
            type: 'STRING',
            enum: ['임대조건', '시설·수리', '상권·운영'],
          },
          question: { type: 'STRING' },
          reason: { type: 'STRING' },
        },
        required: ['target', 'category', 'question', 'reason'],
      },
      description: '현장 재방문 시 임대인·중개사에게 직접 확인할 구체적 질문 리스트 (4~6개)',
    },
    guardrail_notice: {
      type: 'STRING',
      description: '근거 없는 매출·성공률 예측 제외 및 데이터 범위 한계 고지 문구',
    },
  },
  required: [
    'tradeoff_summary',
    'candidate_a_risks',
    'candidate_b_risks',
    'landlord_checklist',
    'guardrail_notice',
  ],
};

function normalizeChecklistItem(raw: unknown): LandlordChecklistItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const targetRaw = String(item.target ?? '공통').trim();
  const categoryRaw = String(item.category ?? '임대조건').trim();
  const question = String(item.question ?? '').trim();
  const reason = String(item.reason ?? '').trim();

  if (!question || !reason) return null;

  const target: LandlordChecklistItem['target'] =
    targetRaw === '후보 A' || targetRaw === '후보 B' || targetRaw === '공통'
      ? targetRaw
      : targetRaw.includes('A')
        ? '후보 A'
        : targetRaw.includes('B')
          ? '후보 B'
          : '공통';

  const category: LandlordChecklistItem['category'] =
    categoryRaw === '임대조건' ||
    categoryRaw === '시설·수리' ||
    categoryRaw === '상권·운영'
      ? categoryRaw
      : categoryRaw.includes('시설') || categoryRaw.includes('수리')
        ? '시설·수리'
        : categoryRaw.includes('상권') || categoryRaw.includes('운영')
          ? '상권·운영'
          : '임대조건';

  return { target, category, question, reason };
}

function validateAndNormalizeAnalysis(raw: unknown): AiAnalysisResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val)
      ? val
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter((x) => x.length > 0)
      : [];

  const tradeoff_summary = toStringArray(obj.tradeoff_summary);
  const candidate_a_risks = toStringArray(obj.candidate_a_risks);
  const candidate_b_risks = toStringArray(obj.candidate_b_risks);
  const landlord_checklist = Array.isArray(obj.landlord_checklist)
    ? obj.landlord_checklist
        .map(normalizeChecklistItem)
        .filter((x): x is LandlordChecklistItem => x !== null)
    : [];
  const guardrail_notice =
    typeof obj.guardrail_notice === 'string' && obj.guardrail_notice.trim().length > 0
      ? obj.guardrail_notice.trim()
      : '근거 없는 매출·성공률 예측을 제외하고 입력 매물 조건, 현장 메모, 공공통계 기준의 차이만 정리했습니다.';

  if (
    tradeoff_summary.length === 0 ||
    candidate_a_risks.length === 0 ||
    candidate_b_risks.length === 0 ||
    landlord_checklist.length === 0
  ) {
    return null;
  }

  return {
    tradeoff_summary: tradeoff_summary.slice(0, 4),
    candidate_a_risks: candidate_a_risks.slice(0, 5),
    candidate_b_risks: candidate_b_risks.slice(0, 5),
    landlord_checklist: landlord_checklist.slice(0, 7),
    guardrail_notice,
  };
}

function buildCompactPromptInput(body: AnalyzeRequestBody) {
  const { criteria, candidateA, candidateB, comparison } = body;
  return {
    userCriteria: criteria,
    industryMismatch: comparison.industryMismatch,
    industryMismatchMessage: comparison.industryMismatchMessage,
    diffs_B_minus_A: comparison.diffs,
    candidateA: {
      name: candidateA.name,
      address: candidateA.address,
      adminDong: candidateA.adminDongKey,
      industry: candidateA.industry,
      depositManwon: candidateA.deposit,
      monthlyRentManwon: candidateA.monthlyRent,
      maintenanceFeeManwon: candidateA.maintenanceFee,
      monthlyFixedCostManwon: comparison.evalA.monthlyFixedCost,
      costPerPyeongManwon: comparison.evalA.costPerPyeong,
      areaPyeong: candidateA.areaPyeong,
      areaSqm: comparison.evalA.areaSqm,
      floor: candidateA.floor,
      keyMoneyManwon: candidateA.keyMoney,
      repairCostManwon: candidateA.repairCost,
      initialOutlayTotalManwon: comparison.evalA.initialOutlayTotal,
      fieldNotes: candidateA.fieldNotes,
      ruleChecks: comparison.evalA.checks,
      commercialRadiusSummary: {
        scope: `입력 좌표 기준 반경 ${comparison.evalA.commercial.radiusMeters}m`,
        totalStores: comparison.evalA.commercial.totalStores,
        sameIndustryCount: comparison.evalA.commercial.sameIndustryCount,
        sameIndustryDensityPct: comparison.evalA.commercial.sameIndustryDensityPct,
        categoryCounts: comparison.evalA.commercial.categoryCounts,
      },
      residentPopulationSummary: comparison.evalA.population
        ? {
            scope: '선택 행정구역 단위 거주 배후인구 참고자료 (실제 유동인구 아님)',
            adminDong: comparison.evalA.population.key,
            totalPopulation: comparison.evalA.population.totalPopulation,
            age20Pct: comparison.evalA.population.age20Pct,
            age30Pct: comparison.evalA.population.age30Pct,
            age40Pct: comparison.evalA.population.age40Pct,
            age50PlusPct: comparison.evalA.population.age50PlusPct,
          }
        : null,
    },
    candidateB: {
      name: candidateB.name,
      address: candidateB.address,
      adminDong: candidateB.adminDongKey,
      industry: candidateB.industry,
      depositManwon: candidateB.deposit,
      monthlyRentManwon: candidateB.monthlyRent,
      maintenanceFeeManwon: candidateB.maintenanceFee,
      monthlyFixedCostManwon: comparison.evalB.monthlyFixedCost,
      costPerPyeongManwon: comparison.evalB.costPerPyeong,
      areaPyeong: candidateB.areaPyeong,
      areaSqm: comparison.evalB.areaSqm,
      floor: candidateB.floor,
      keyMoneyManwon: candidateB.keyMoney,
      repairCostManwon: candidateB.repairCost,
      initialOutlayTotalManwon: comparison.evalB.initialOutlayTotal,
      fieldNotes: candidateB.fieldNotes,
      ruleChecks: comparison.evalB.checks,
      commercialRadiusSummary: {
        scope: `입력 좌표 기준 반경 ${comparison.evalB.commercial.radiusMeters}m`,
        totalStores: comparison.evalB.commercial.totalStores,
        sameIndustryCount: comparison.evalB.commercial.sameIndustryCount,
        sameIndustryDensityPct: comparison.evalB.commercial.sameIndustryDensityPct,
        categoryCounts: comparison.evalB.commercial.categoryCounts,
      },
      residentPopulationSummary: comparison.evalB.population
        ? {
            scope: '선택 행정구역 단위 거주 배후인구 참고자료 (실제 유동인구 아님)',
            adminDong: comparison.evalB.population.key,
            totalPopulation: comparison.evalB.population.totalPopulation,
            age20Pct: comparison.evalB.population.age20Pct,
            age30Pct: comparison.evalB.population.age30Pct,
            age40Pct: comparison.evalB.population.age40Pct,
            age50PlusPct: comparison.evalB.population.age50PlusPct,
          }
        : null,
    },
  };
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;
  try {
    body = (await request.json()) as AnalyzeRequestBody;
    if (!body?.criteria || !body?.candidateA || !body?.candidateB || !body?.comparison) {
      return NextResponse.json(
        { error: '분석에 필요한 후보 A/B 및 비교 데이터가 누락되었습니다.' },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: '잘못된 JSON 요청 형식입니다.' }, { status: 400 });
  }

  const generatedAt = new Date().toISOString();
  const model = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();

  // 환경변수 미설정 또는 플레이스홀더인 경우 즉시 SAFE FALLBACK 반환
  if (!apiKey || apiKey === 'AQ.replace_with_your_google_ai_studio_key') {
    const response: AiAnalyzeResponse = {
      mode: 'SAFE FALLBACK',
      model: 'local-rule-engine',
      fallbackReason: 'GEMINI_API_KEY 미설정 — 로컬 규칙 기반 근거 분석 엔진 동작',
      generatedAt,
      analysis: buildFallbackAnalysis(body),
    };
    return NextResponse.json(response);
  }

  // 2026 신형 AQ. 키 호출 규칙 엄수:
  // - generativelanguage.googleapis.com/v1beta/models/${model}:generateContent
  // - 반드시 x-goog-api-key HTTP 헤더 사용 (URL ?key= 쿼리 및 Authorization: Bearer 금지)
  // - AIza 접두사 정규식 검사 금지
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const promptPayload = buildCompactPromptInput(body);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 16000);

  try {
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }],
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `아래 JSON 입력 데이터를 근거로 후보 A와 후보 B의 실질적 트레이드오프, 후보별 확인 리스크, 임대인·중개사 현장 확인 체크리스트를 JSON으로 작성하세요.\n\n${JSON.stringify(
                  promptPayload
                )}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!geminiRes.ok) {
      const status = geminiRes.status;
      const fallbackResponse: AiAnalyzeResponse = {
        mode: 'SAFE FALLBACK',
        model,
        fallbackReason: `Gemini API 응답 오류 (HTTP ${status}) — 무중단 로컬 폴백 엔진 전환`,
        generatedAt,
        analysis: buildFallbackAnalysis(body),
      };
      return NextResponse.json(fallbackResponse);
    }

    const data = (await geminiRes.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const cleanedText = rawText
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      parsed = null;
    }

    const validated = validateAndNormalizeAnalysis(parsed);
    if (!validated) {
      const fallbackResponse: AiAnalyzeResponse = {
        mode: 'SAFE FALLBACK',
        model,
        fallbackReason: 'AI JSON 스키마 검증 불일치 — 무중단 로컬 폴백 엔진 전환',
        generatedAt,
        analysis: buildFallbackAnalysis(body),
      };
      return NextResponse.json(fallbackResponse);
    }

    const liveResponse: AiAnalyzeResponse = {
      mode: 'LIVE GEMINI AI',
      model,
      generatedAt,
      analysis: validated,
    };
    return NextResponse.json(liveResponse);
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof Error && error.name === 'AbortError';
    const fallbackResponse: AiAnalyzeResponse = {
      mode: 'SAFE FALLBACK',
      model,
      fallbackReason: isAbort
        ? 'Gemini API 응답 시간 초과 — 무중단 로컬 폴백 엔진 전환'
        : '네트워크 오류 — 무중단 로컬 폴백 엔진 전환',
      generatedAt,
      analysis: buildFallbackAnalysis(body),
    };
    return NextResponse.json(fallbackResponse);
  }
}
