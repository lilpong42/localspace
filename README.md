# 한냥 LocalSpace (Hannyang LocalSpace · 로컬스페이스)
> 공공데이터와 실제 매물 조건·현장 메모를 연결한 예비 창업자 맞춤형 공간 비교 AI 웹 플랫폼

**출품 정보:** 제1회 동양AI빅데이터융합 아이디어 공모전 (AI빅데이터분야 / 팀명: 호날두의 아이들 · 한냥 시리즈)  
**라이브 서비스:** https://hannyang-localspace.vercel.app  
**GitHub 저장소:** https://github.com/lilpong42/localspace

---

## 핵심 설계 철학
1. **억지 순위·근거 없는 예측 배제:** 근거가 부족한 예상 매출액·창업 성공률 예측이나 100점 만점 1등/2등 랭킹을 제공하지 않습니다.
2. **객관적 근거 정리와 현장 검증 지원:** 사용자 설정 기준(예산·면적·층수·업종) 충족 여부를 항목별(`충족` / `주의` / `초과`)로 진단하고, 후보 A·B의 실질적 트레이드오프와 현장 재방문 시 임대인에게 확인할 질문 리스트를 정리합니다.
3. **데이터 문해력과 투명성:** 출처·기준시점, 조회 범위 차이(`상권 = 반경 기준` vs `인구 = 행정구역 단위 기준`), 인구 성격(`거주 배후인구 참고자료, 실제 유동인구 아님`), 업종 상이 비교 오류 방지 경고를 화면에 상시 노출합니다.

---

## 서버리스 API 아키텍처 (`/src/app/api`)
| 엔드포인트 | 역할 | 라이브 키 연결 시 | 키 미설정 시 (무중단 폴백) |
| --- | --- | --- | --- |
| `POST /api/analyze` | 근거 기반 AI 비교·검증 및 임대인 체크리스트 JSON 생성 | `GEMINI_API_KEY` (`AQ.` 신형 키, `x-goog-api-key` 헤더) → `LIVE GEMINI AI` | 내장 규칙 기반 근거 분석 엔진 (`SAFE FALLBACK`) |
| `GET /api/commercial` | 좌표 기준 반경 300m/500m 상가업소 집계 | `DATA_GO_KR_API_KEY` → 소상공인시장진흥공단 실시간 OpenAPI | `data/commercial_sample.csv` 로컬 인덱스 |
| `GET /api/geocode` | 도로명/지번 주소 → 위도·경도·행정동 변환 | `KAKAO_REST_API_KEY` → 카카오 로컬 REST API | 내장 시연 좌표 + OpenStreetMap Nominatim |
| `GET /api/health` | 서버 API 연동 상태 및 데이터셋 메타 확인 | 키 값은 노출하지 않고 설정 여부·모드만 안전 반환 | 동일 |

---

## 실행 및 Vercel 배포 설정 (2026 신형 `AQ.` Gemini API 키 지원)

```bash
npm install
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY 등 설정 (미설정 시에도 SAFE FALLBACK으로 즉시 시연 가능)
npm run dev
```

- **Vercel 배포:** [lilpong42/localspace](https://github.com/lilpong42/localspace)를 Vercel에서 Import한 뒤, `Project Settings → Environment Variables`에 아래 변수를 추가하면 됩니다.
  - `GEMINI_API_KEY`: `AQ.`로 시작하는 Google AI Studio API 키
  - `GEMINI_MODEL`: `gemini-2.5-flash`
  - *(선택)* `DATA_GO_KR_API_KEY`, `KAKAO_REST_API_KEY`
