# 로컬스페이스 (LocalSpace)
> 공공데이터와 실제 매물 조건·현장 메모를 연결한 예비 창업자 맞춤형 공간 비교 AI 웹 플랫폼

**출품 정보:** 제1회 동양AI빅데이터융합 아이디어 공모전 (AI빅데이터분야 / 팀명: 호날두의 아이들)

---

## 핵심 설계 철학
1. **억지 순위·근거 없는 예측 배제:** 근거가 부족한 예상 매출액·창업 성공률 예측이나 100점 만점 1등/2등 랭킹을 제공하지 않습니다.
2. **객관적 근거 정리와 현장 검증 지원:** 사용자 설정 기준(예산·면적·층수·업종) 충족 여부를 항목별(`충족` / `주의` / `초과`)로 진단하고, 후보 A·B의 실질적 트레이드오프와 현장 재방문 시 임대인에게 확인할 질문 리스트를 정리합니다.
3. **데이터 문해력과 투명성:** 출처·기준시점, 조회 범위 차이(`상권 = 반경 기준` vs `인구 = 행정구역 단위 기준`), 인구 성격(`거주 배후인구 참고자료, 실제 유동인구 아님`), 업종 상이 비교 오류 방지 경고를 화면에 상시 노출합니다.

---

## 주요 모듈
- **모듈 A (창업 기준 & 원클릭 1분 시연 프리셋 3종):** 비용 vs 면적 딜레마 / 지방 중소도시 빈점포 활성화 / 비교 오류 경고 시연(업종 상이) + 300m/500m 반경 전환
- **모듈 B (후보 A vs B 병렬 비교 보드 & Leaflet 지도):** 좌/우 대조 카드, 평↔㎡ 자동 환산, 내장 주소 퀵 피커 및 좌표 직접 입력, 반경 원형 영역 및 주변 점포 마커 시각화
- **모듈 C (정량 정합성 진단 엔진):** 월 고정비(월세+관리비), 보증금 환산 참고치(연 5%), 평당 월 고정비, 초기 투입 합계, 동종 업종 밀집도(%) 및 Pass/Warn/Fail 진단
- **모듈 D (근거 기반 AI 비교·검증 & 임장 체크리스트):** Next.js 서버 라우트(`/api/analyze`)에서 Gemini API 호출(Structured JSON) + 무중단 로컬 폴백 엔진(`LIVE GEMINI AI` / `SAFE FALLBACK`), 체크박스 및 현장 답변 메모 `localStorage` 자동 저장
- **모듈 E (데이터 검증·고해상도 차트 & A4 상담 리포트):** 2x 고해상도 PNG 차트 다운로드 2종, 원본 샘플 상가 데이터 테이블, `public/data.csv` 및 `public/analysis.R` 열람·다운로드 모달, 원클릭 A4 인쇄/PDF 리포트

---

## 실행 및 환경변수 설정 (2026 신형 `AQ.` Gemini API 키 지원)

```bash
npm install
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY 설정 (미설정 시 SAFE FALLBACK 모드로 무중단 동작)
npm run dev
```

- **보안 및 호출 규격:** `/api/analyze` 서버 라우트에서만 `process.env.GEMINI_API_KEY`를 읽으며, `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` 엔드포인트에 `x-goog-api-key` HTTP 헤더로만 전송합니다.
- **Vercel 배포:** Vercel 프로젝트의 `Environment Variables`에 `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`를 등록하면 별도 설정 없이 즉시 배포됩니다.
