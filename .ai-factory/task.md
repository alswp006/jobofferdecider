# TASK — JobOfferDecider

## Epic 1. 타입 정의

**Risk Assessment**
- Complexity: **Low**
- Risk factors: RouteState 누락 시 페이지 간 state 계약 불일치 → `/compare` 직접 진입 런타임 크래시. 파생 타입(AxisScore/Verdict/ScoreResult)이 계산 엔진보다 늦게 정의되면 전면 재작업.
- Mitigation: 모든 엔티티 + RouteState + 상수를 최우선 단일 태스크로 확정. 이후 모든 태스크는 import만 하며 타입을 재정의하지 않는다.

### Task 1.1 엔티티 & RouteState 타입 정의
- Description: SPEC Data Models 전체(OfferKind, Offer, Weights, AxisScore, MoneyBreakdown, Verdict, ScoreResult, UnlockState, AppMeta)와 페이지 간 네비게이션 계약(RouteState), 저장 결과 타입(`SaveResult`), localStorage 키 상수(`STORAGE_KEYS`), 축 순서/라벨 상수(`AXIS_ORDER`, `AXIS_LABELS`), 판정 라벨 맵(`VERDICT_LABELS`), 기본 가중치 상수(`DEFAULT_WEIGHTS`)를 정의한다. 런타임 로직 없음(상수 + 타입만).
- DoD:
  - `src/lib/types.ts`가 SPEC의 9개 인터페이스/타입을 필드명·타입 그대로 export
  - `export const AXIS_ORDER = ['money','remote','commute','growth','culture','stability'] as const`
  - `export type SaveResult = { ok: true } | { ok: false; error: string }`
  - `export type RouteState = { "/": undefined; "/offer/new": { kind: OfferKind } | undefined; "/weights": undefined; "/compare": { targetOfferId: string } | undefined; "/rank": undefined; }`
  - `AXIS_LABELS`가 6축 → '실수령','재택','통근','성장성','조직문화','안정성' 매핑
  - `VERDICT_LABELS`가 5개 verdict → "이직 강력 추천"/"이직 우세"/"박빙 — 추가 협상 필요"/"잔류 우세"/"잔류 강력 추천" 매핑
  - `STORAGE_KEYS = { offers:'jod.offers.v1', weights:'jod.weights.v1', unlock:'jod.unlock.v1', meta:'jod.meta.v1' }`
  - `DEFAULT_WEIGHTS`의 6축 값이 모두 5
  - 파일 내 HEX 색상 리터럴 0개, `npx tsc --noEmit` 통과
- Covers: [F1-AC-2]
- Files: `src/lib/types.ts`
- Depends on: none

---

## Epic 2. 데이터 레이어

**Risk Assessment**
- Complexity: **Medium**
- Risk factors: (a) 손상 JSON 파싱 throw → 앱 화이트스크린, (b) `QuotaExceededError`가 호출부로 전파되어 크래시, (c) `crypto.randomUUID` 사용 시 구형 WebView 크래시, (d) 판정 경계값(gap 15.0 vs 14.9) 오프바이원, (e) 가중치 합 0 → 0 나눗셈으로 화면에 `NaN` 노출.
- Mitigation: 저장(2.1) / 검증·실수령(2.2) / 점수·판정·협상(2.3) / 상태 훅(2.4)을 **서로 다른 파일**로 완전 분리해 파일 충돌 없이 독립 검증. 순수 함수 계층이 UI보다 먼저 완성되므로 경계값 버그를 UI 없이 잡는다. UI는 storage를 직접 호출하지 않고 2.4 훅만 사용해 예외 전파 경로를 1곳으로 좁힌다.

### Task 2.1 localStorage CRUD 헬퍼
- Description: 템플릿 localStorage 헬퍼를 감싸 4개 키의 안전한 읽기/쓰기를 구현한다. 읽기는 try/catch로 파싱 실패 시 기본값 반환(throw·`console.error` 금지), 쓰기는 `QuotaExceededError`를 잡아 `SaveResult`로 반환. id는 모듈 스코프 counter를 쓰는 `o_${Date.now()}_${counter}` 방식.
- DoD:
  - `loadOffers(): Offer[]` — 키 없음 또는 `"{not-json"` 저장 시 `[]` 반환, throw 0건, `console.error` 호출 0건
  - `saveOffer(offer): SaveResult` — `kind==='current'` 저장 시 기존 current의 `id`·`createdAt` 유지, `updatedAt`만 갱신, 배열 내 current 개수 1 유지
  - `kind==='offer'`이고 기존 offer 3건이면 `{ ok:false, error:"제안 직장은 최대 3개까지 비교할 수 있어요" }`
  - `setItem`이 `QuotaExceededError`를 던지면 `{ ok:false, error:"저장 공간이 부족합니다. 오퍼를 삭제 후 다시 시도해주세요." }` 반환, 예외 전파 없음
  - `deleteOffer(id): SaveResult`, `getOfferById(id): Offer | null`, `getCurrentOffer(): Offer | null` 제공
  - `loadWeights(): Weights` — 키 없으면 `DEFAULT_WEIGHTS`(6축 전부 5) 반환
  - `saveWeights(w): SaveResult` — 6개 합 0이면 `{ ok:false, error:"중요도를 최소 1개 이상 1점 이상으로 설정해주세요" }`
  - `loadUnlock()/addUnlockKey(currentId,targetId)`, `loadMeta()/setCalcNoticeAcknowledged(true)` 제공
  - `newOfferId()`가 `crypto.randomUUID` 미사용이며 연속 2회 호출 시 서로 다른 문자열 반환
- Covers: [F1-AC-5, F1-AC-6, F1-AC-8]
- Files: `src/lib/storage.ts`
- Depends on: Task 1.1

### Task 2.2 입력 검증 + 월 실수령 계산
- Description: `validateOffer`(필드별 한국어 에러 반환)와 `calcMonthlyNet`, `getEffectiveTaxRate`(SPEC 계산 규칙 1의 결정론적 순수 함수)를 `src/lib/calc.ts`에 구현한다. 이 태스크만 `calc.ts`를 생성·수정한다.
- DoD:
  - `calcMonthlyNet({baseSalaryManwon:6000,bonusManwon:600,welfarePointManwon:120,remoteDaysPerWeek:2,commuteCostPerDayWon:3000,lunchCostPerDayWon:9000})` → `4538000`, 동일 입력 10회 호출 결과 전부 동일
  - 중간값 검증: `annualGrossWon=66,000,000`, `effectiveTaxRate=0.18`, `annualNetWon=54,120,000`, `officeDaysPerYear=138`, `annualCommuteCostWon=414,000`, `annualLunchCostWon=1,242,000`
  - `getEffectiveTaxRate` 경계: 29,999,999→0.10, 30,000,000→0.14, 50,000,000→0.18, 70,000,000→0.23, 100,000,000→0.28
  - `validateOffer({companyName:"",baseSalaryManwon:999,commuteMinutesOneWay:181,growthScore:6})` 결과가 `"회사명을 입력해주세요"`, `"연봉은 1,000만원 이상 50,000만원 이하로 입력해주세요"`, `"통근시간은 0분 이상 180분 이하로 입력해주세요"`, `"성장성은 1점 이상 5점 이하로 선택해주세요"` 4개를 모두 포함
  - `validateOffer` 반환 형태가 `{ field: keyof Offer; message: string }[]` 이며 `errors.map(e=>e.message)`로 위 배열 비교 가능
  - `Number.isInteger`가 false인 값도 거부
  - `console.error` 0건, HEX 0건
- Covers: [F1-AC-1, F1-AC-7]
- Files: `src/lib/calc.ts`
- Depends on: Task 1.1

### Task 2.3 정규화·총점·판정·협상 포인트
- Description: `buildScoreResult(current, target, weights): ScoreResult`를 **별도 파일** `src/lib/score.ts`에 구현한다(`calc.ts`는 import만 하고 수정하지 않음). 축별 raw 추출 → 상대 정규화(40~100, 동률 50, commute 역방향) → 가중 총점(소수 1자리) → gap 기반 verdict → 협상 포인트 정확히 3개. 협상 문구 템플릿은 `src/lib/negotiation.ts`로 분리.
- DoD:
  - remote raw 0 vs 3 → `normCurrent===40`, `normTarget===100`; commute 30 vs 30 → 둘 다 50
  - `axes.length===6`이고 `axes.map(a=>a.axis)`가 `AXIS_ORDER`와 순서까지 일치
  - verdict 경계: gap 15.0→`strong_move`, 14.9→`lean_move`, 4.9→`neutral`, -5.0→`lean_stay`, -15.0→`strong_stay`
  - 열세 축 0개일 때 `negotiationPoints.length===3`, `[0]==="사이닝 보너스를 요청하세요. 통상 연봉의 10~20%가 협상 범위입니다."`, 배열 내 중복 문자열 0
  - 열세 축은 weight 내림차순, 동률 시 `AXIS_ORDER` 순으로 상위 3개 선택. money 문구의 `needManwon = Math.ceil(|diffYearlyWon| / (1 - taxRate) / 10000)`
  - `sumWeight===0`이면 `DEFAULT_WEIGHTS`로 계산하고 결과 어디에도 `NaN`이 없음(`JSON.stringify(result).includes('NaN') === false`)
  - `money` 브레이크다운 6개 필드가 모두 정수(`Number.isInteger` true)
  - `src/lib/calc.ts` 파일은 이 태스크에서 변경되지 않음
- Covers: [F1-AC-3, F1-AC-4]
- Files: `src/lib/score.ts`, `src/lib/negotiation.ts`
- Depends on: Task 2.2

### Task 2.4 앱 상태 훅
- Description: storage 위에 얹는 경량 상태 훅 4개를 만든다. UI는 localStorage를 직접 호출하지 않는다. 저장 실패는 `SaveResult`를 그대로 반환해 화면이 Toast를 띄운다.
- DoD:
  - `useOffers()`가 `{ isLoading, offers, current, save, remove, refresh }` 반환, 초기 렌더에서 `isLoading:true`를 1틱 이상 노출(스켈레톤 렌더 가능)
  - `useOffers().save()`가 storage의 `SaveResult`를 그대로 반환하고 throw 0건
  - `useWeights()`가 저장값 6축 합이 0이면 `DEFAULT_WEIGHTS`를 반환하고 `wasReset: true` 플래그를 함께 노출, 그 외엔 `wasReset: false`
  - `useUnlock().isUnlocked(currentId,targetId)`가 `` `${currentId}:${targetId}` `` 키 존재 여부를 boolean 반환, `unlock(currentId,targetId)` 제공
  - `useAppMeta()`가 `{ isLoading, calcNoticeAcknowledged, acknowledgeCalcNotice }` 제공
  - 로드 실패(파싱 오류) 시 `loadError: true`를 노출하고 기본값으로 렌더 가능
  - 모든 훅에서 `console.error` 0건, throw 0건, 훅만 추가한 상태로 `npx tsc --noEmit` 및 `npm run build` 통과
- Covers: [F2-AC-7, F4-AC-6, F6-AC-6]
- Files: `src/hooks/useOffers.ts`, `src/hooks/useWeights.ts`, `src/hooks/useUnlock.ts`, `src/hooks/useAppMeta.ts`
- Depends on: Task 2.1

---

## Epic 3. UI 페이지

**Risk Assessment**
- Complexity: **Medium~High**
- Risk factors: (a) `location.state` 없이 `/compare` 직접 진입·새로고침 시 `.map()` 크래시(2026-08-03 SplitMate 실사고 — 완주율 0%), (b) TDS 내부 여백을 인라인 스타일로 덮어써 검수 반려, (c) 리워드 광고 실패 경로 미처리로 영구 잠금, (d) SubmitFooter가 포커스된 입력 필드를 가림, (e) 캔버스 렌더 실패 시 무반응.
- Mitigation: 페이지당 1태스크로 분리하고 state 수신 화면(`/compare`, `/offer/new`)마다 "state 없이 직접 진입해도 크래시하지 않고 홈으로 이동 또는 안전 기본값 렌더" DoD를 명시. 데이터·계산 계층이 선행 완료되어 페이지는 조립만 수행. 비교 화면은 게이트(3.4)와 상세/이미지(3.5)로 쪼개 10분 단위를 유지하고, 3.5는 3.4에 **명시적 depends_on**을 걸어 `ComparePage.tsx` 순차 수정을 보장한다.

### Task 3.1 홈 화면 (`/`)
- Description: `ScreenScaffold` + TDS Top으로 홈을 구성한다. 스켈레톤 → (빈 상태 | 오퍼 카드 목록 + SummaryHero + MiniBar) 분기, 최초 진입 계산 고지 AlertDialog, CTA 가드 Toast를 처리한다.
- DoD:
  - `isLoading`일 때 `data-testid="home-skeleton"` TDS Skeleton 3줄만 렌더되고 `empty-state`는 렌더되지 않음
  - offers가 빈 배열이면 `data-testid="empty-state"`에 `Asset.ContentIcon` + "현재 직장부터 등록해보세요", SubmitFooter에 "현재 직장 등록" Button(display="block", 높이 48px)
  - current 1 + offer 2건이면 `data-testid="offer-card"`가 정확히 2개, 각 카드에 회사명과 "월 실수령 {n}원"(천단위 콤마) 표시, 카드 최소 높이 64px
  - 카드 탭 → `navigate('/compare', { state: { targetOfferId } satisfies NonNullable<RouteState["/compare"]> })`, "수정" 탭 → `navigate('/offer/' + id + '/edit')`
  - `data-testid="summary-hero"`에 최고 실수령 오퍼의 월 차액이 CountUp으로 표시되고 옆에 "vs 현재 직장" 캡션; 오퍼 2건 이상이면 `data-testid="offer-minibar"` 렌더
  - `calcNoticeAcknowledged===false`면 AlertDialog에 "이 앱의 점수와 추천은 입력값 기반 규칙 계산 결과이며 법률·세무 자문이 아닙니다"가 1회 표시되고, "확인" 탭 시 `jod.meta.v1.calcNoticeAcknowledged=true` 저장 → 재진입 시 미표시
  - current 없이 "제안 직장 추가" 탭 → Toast "현재 직장을 먼저 등록해주세요", `/offer/new` 이동 없음
  - offer 3건 상태에서 "제안 직장 추가" 탭 → Toast "제안 직장은 최대 3개까지 비교할 수 있어요", `offer-card` 개수 3 유지
  - `loadError` 시 빈 상태 + Toast "저장된 데이터를 불러오지 못했어요"
  - 인라인 padding/margin 오버라이드 0건(간격은 TDS `Spacing` size prop만), HEX 0건
- Covers: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-6, F2-AC-7]
- Files: `src/pages/HomePage.tsx`
- Depends on: Task 2.4, Task 2.2

### Task 3.2 직장 정보 입력/수정 화면 (`/offer/new`, `/offer/:id/edit`)
- Description: 11개 필드 입력 폼을 TDS TextField/Chip으로 구성하고 검증·저장·프리필·not-found·모바일 키보드 대응을 처리한다.
- DoD:
  - `/offer/new`에서 `const s = (useLocation().state as RouteState["/offer/new"]) ?? null;` 로 읽고 `s?.kind ?? 'offer'` 폴백 — **state 없이 직접 진입/새로고침해도 크래시하지 않고 'offer' 모드로 렌더**
  - `/offer/:id/edit`에서 조회 전 `data-testid="form-skeleton"` 표시, 없는 id면 `data-testid="not-found"` + "삭제되었거나 없는 오퍼예요" + "홈으로" Button → `navigate('/', { replace: true })`
  - 존재하는 id면 모든 TextField/Chip 값이 저장값과 일치 프리필, Top 타이틀 "{companyName} 수정"
  - 저장 성공 시 레코드 추가/갱신 + Toast "저장했어요" + `navigate('/', { replace: true })`
  - `kind:'current'` 저장 시 `jod.offers.v1`의 current 개수 1 유지, 기존 `id` 유지, `updatedAt`만 갱신
  - `companyName:""` 저장 시 해당 TextField 하단 "회사명을 입력해주세요" 표시, localStorage 미변경
  - `baseSalaryManwon:60000` + `commuteMinutesOneWay:200` 저장 시 두 에러 메시지가 각 필드 하단에 동시 표시되고 첫 에러 필드로 `scrollIntoView({ block:'center' })` 호출
  - 숫자 TextField 전부 `inputMode="numeric"` + `pattern="[0-9]*"`, 포커스 시 `scrollIntoView({ block:'center' })` 호출, 키보드 표시 중에도 SubmitFooter 저장 버튼 높이 ≥44px 유지
  - "저장" 탭 직후 Button `loading` 전환 + 중복 탭 무시 → 레코드 1건만 생성
  - Chip(재택 0~5, 정성 3항목 1~5) 터치 영역 44x44px 이상, TextField 높이 ≥48px
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6, F3-AC-7, F3-AC-8]
- Files: `src/pages/OfferFormPage.tsx`
- Depends on: Task 2.4, Task 2.2

### Task 3.3 가중치 설정 화면 (`/weights`)
- Description: 6축 TDS Slider(0~10), 실시간 비중 미리보기, 기본값 복원, 저장을 구현한다.
- DoD:
  - 로딩 중 `data-testid="weights-skeleton"` 6줄만 렌더되고 슬라이더 미렌더
  - money 9 / commute 2로 조절 후 저장 시 `jod.weights.v1`이 `{money:9,remote:5,commute:2,growth:5,culture:5,stability:5}`로 저장되고 Toast "가중치를 저장했어요" 후 `navigate(-1)`
  - `{money:10, 나머지 0}`일 때 `data-testid="weight-preview"` 단일 Card 안에서 money "100%", 나머지 5축 각 "0%", `data-testid="weight-minibar"`로 시각화
  - 6축 전부 0으로 저장 시 Toast "중요도를 최소 1개 이상 1점 이상으로 설정해주세요", `jod.weights.v1` 미변경
  - "기본값으로 되돌리기" 탭 시 6개 슬라이더 전부 5, 미리보기 각 "17%"
  - 슬라이더 핸들 터치 영역 ≥44x44px, "기본값으로 되돌리기"/"저장" 버튼 높이 각 ≥48px
  - `QuotaExceededError` 시 Toast "저장 공간이 부족합니다. 오퍼를 삭제 후 다시 시도해주세요." 표시 후 화면 유지(크래시 없음)
  - 파일 내 `#[0-9a-fA-F]{3,8}` 매칭 0건, 색상은 `var(--tds-color-*)` 또는 TDS 기본값만
- Covers: [F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7, F4-AC-8]
- Files: `src/pages/WeightsPage.tsx`
- Depends on: Task 2.4

### Task 3.4 비교 화면 — state 가드 + 요약 + 리워드 게이트 (`/compare`)
- Description: `/compare`의 state 수신·폴백, 무료 요약 히어로, 잠금 패널, `TossRewardAd` 게이트, 해제 상태 저장/자동 해제를 구현한다. 해제 시 렌더할 상세 영역은 이 태스크에서 빈 컨테이너(`data-testid="compare-detail-slot"`)로 두고 Task 3.5가 채운다.
- DoD:
  - `const s = (useLocation().state as RouteState["/compare"]) ?? null;` → `s?.targetOfferId` 없으면 첫 `kind:'offer'` 레코드로 폴백, 그것도 없으면 `<Navigate to="/" replace />` — **state 없이 `/compare` 직접 진입·새로고침해도 크래시하지 않고 홈으로 이동**
  - current 미등록 시 "현재 직장을 먼저 등록해주세요" 안내 + "현재 직장 등록" Button(→ `navigate('/offer/new',{state:{kind:'current'}})`)만 표시, `score-table`·`locked-panel` 모두 미렌더, `buildScoreResult` 호출 0회
  - 미해제 상태: `data-testid="locked-panel"` 표시 + `data-testid="score-table"`이 DOM에 **존재하지 않음**, `data-testid="summary-hero"`(월 실수령 차액 CountUp)는 광고 없이 표시
  - "종합 분석 보기" 탭 → `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 시청 완료 시 `jod.unlock.v1.unlockedComparisonKeys`에 `"{currentId}:{targetId}"` 추가 후 `data-testid="score-table"` 렌더
  - 광고 로드 실패/중도 이탈 시 Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.", unlock 키 미추가, `locked-panel` 유지 + "다시 시도" 버튼(높이 ≥44px)
  - unlock 키가 이미 있으면 진입 즉시 광고 노출 없이 `score-table` 렌더
  - 계산 렌더 전 `data-testid="compare-skeleton"` 표시, 계산 1,000ms 이내 완료 후 스켈레톤 제거
  - `ScreenScaffold`로 감싸고 Top 타이틀 "{companyName} vs 현재", 모든 버튼 높이 ≥48px
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-4, F5-AC-5, F5-AC-6]
- Files: `src/pages/ComparePage.tsx`, `src/components/LockedPanel.tsx`
- Depends on: Task 2.4, Task 2.3

### Task 3.5 비교 결과 상세 카드 + 계산 고지 + 이미지 저장
- Description: 해제된 결과의 strategy-card 2개, 판정 배지, 축별 비교 6행, 협상 포인트 카드, 계산 고지, 캡처 영역, PNG 저장, 결과 하단 AdSlot을 구현한다. 상세 UI는 신규 컴포넌트 파일에 작성하고 `ComparePage.tsx`는 Task 3.4가 남긴 `compare-detail-slot` 자리에 이 컴포넌트를 연결하는 한 줄만 수정한다(3.4 완료 후 순차 수정).
- DoD:
  - `data-testid="strategy-card"` TDS Card가 정확히 2개(현재 직장/제안 직장), 각 총점이 TDS Typography t2 이상, 우세 Card에 TDS Badge "우세"
  - `data-testid="verdict-card"`에 `VERDICT_LABELS` 문구 표시, `data-testid="negotiation-card"` 안에 협상 포인트가 TDS ListRow로 정확히 3개
  - `data-testid="calc-notice"`에 "입력값 기반 규칙 계산 결과입니다. 법률·세무 자문이 아닙니다" 표시
  - `data-testid="capture-area"`가 strategy-card 2개 + 판정 배지 + 협상 3행 + `calc-notice`를 감싸고 `<AdSlot />`을 **포함하지 않음**; `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 배너는 negotiation-card **아래에만** 배치되어 어떤 카드와도 좌표 겹침 0
  - "결과 이미지 저장" Button(display="block", 높이 ≥44px) 탭 → capture-area가 PNG blob으로 변환되고 파일명 `joboffer-{targetCompanyName}-{YYYYMMDD}.png`로 다운로드 트리거 + Toast "이미지를 저장했어요"
  - 다운로드는 동일 오리진 `blob:` URL + `<a download>`만 사용하고 사용 후 `URL.revokeObjectURL` 호출, `window.open`/`window.location.href` 사용 0건
  - blob이 null이면 Toast "이미지를 만들지 못했어요. 화면 캡처를 이용해주세요." 표시 후 결과 화면 유지(크래시 없음, `console.error` 0건)
  - 저장 탭 직후 Button `loading` 상태 + 중복 탭 무시 → 다운로드 1회만 트리거
  - 잠금 상태에서는 "결과 이미지 저장" 버튼이 DOM에 존재하지 않음
  - 캡처 대상 요소에 HEX 색상 0건(`var(--tds-color-*)`만 사용), 다크모드에서 텍스트가 배경과 동일 색으로 렌더되지 않음
- Covers: [F5-AC-7, F5-AC-8, F7-AC-1, F7-AC-2, F7-AC-3, F7-AC-4, F7-AC-5, F7-AC-6, F7-AC-7, F7-AC-8]
- Files: `src/components/CompareDetail.tsx`, `src/components/StrategyCards.tsx`, `src/components/NegotiationCard.tsx`, `src/lib/captureImage.ts`, `src/pages/ComparePage.tsx`(3.4가 남긴 slot 연결 1곳만 수정)
- Depends on: Task 3.4

### Task 3.6 순위 비교 화면 (`/rank`)
- Description: 저장된 제안 오퍼를 총점 내림차순 순위표로 렌더하고 축별 Tab MiniBar, 스와이프 삭제, 빈 상태, 가중치 이상 폴백, 광고 배치를 구현한다.
- DoD:
  - 총점 72.0("A사")/81.5("B사")/65.2("C사")일 때 `data-testid="rank-row"` 3개가 위에서 "B사","A사","C사" 순서, 1위 행에 TDS Badge "1위"
  - 각 행은 TDS ListRow이며 회사명·"총점 {n}"·"월 {±n}원" 포함, 높이 ≥56px, 탭 시 `navigate('/compare', { state: { targetOfferId } })`
  - TDS Tab에서 "통근" 선택 시 `data-testid="axis-minibar"`가 통근 정규화 점수 비율로 갱신되고 편도 10분 오퍼 막대가 60분 오퍼보다 김
  - `kind:'offer'` 0건이면 `data-testid="empty-state"` + `Asset.ContentIcon` + "비교할 제안이 아직 없어요" + "제안 직장 추가" Button(display="block")
  - `jod.weights.v1` 6축 전부 0이면 `DEFAULT_WEIGHTS`로 계산해 순위표 렌더 + Toast "중요도 설정이 초기화되었어요", 화면 텍스트에 "NaN" 0건, 크래시 없음
  - 계산 전 `data-testid="rank-skeleton"` 3줄 표시, 순위 행 미렌더
  - 행 좌측 스와이프 → "삭제"(44x44px 이상) → TDS AlertDialog "삭제" 확정 시 `jod.offers.v1`에서 제거, `rank-row` 3→2, Toast "삭제했어요"
  - 가상 스크롤 미사용, 뷰포트 375px에서 `document.body.scrollWidth <= clientWidth`(가로 스크롤 0), 세로 스크롤로 축별 섹션 접근 가능
  - `<AdSlot />`이 순위표 Card와 축별 비교 Card 사이에 배치되어 rank-row와 좌표 겹침 0
- Covers: [F6-AC-1, F6-AC-2, F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-8]
- Files: `src/pages/RankPage.tsx`
- Depends on: Task 2.4, Task 2.3

---

## Epic 4. 통합 + 정책 가드

**Risk Assessment**
- Complexity: **Medium**
- Risk factors: 라우팅 미배선 시 페이지가 존재해도 도달 불가; 검수 반려 사유(HEX 하드코딩, `console.error`, 외부 이탈, 금지 패키지, 구형 API)는 개발 말미에 발견하면 전면 수정 비용이 큼; 홈 배너가 오퍼 카드를 가리면 F2-AC-8 실패.
- Mitigation: 페이지 6개 완료 직후 라우팅(4.1)을 배선해 state 폴백 경로를 실제 새로고침으로 검증하고, 정책 검사(4.2)는 소스 트리 전체가 존재하는 마지막 단계에서 자동 스크립트로 반복 실행 가능하게 만든다.

### Task 4.1 라우팅 + FloatingTabBar 배선
- Description: react-router-dom 라우트 6개를 등록하고 FloatingTabBar(홈/순위/중요도)를 연결한다. 알 수 없는 경로는 홈으로 리다이렉트.
- DoD:
  - `/`, `/offer/new`, `/offer/:id/edit`, `/weights`, `/compare`, `/rank` 6개 라우트가 각 페이지 컴포넌트에 매핑됨
  - `*` 경로가 `<Navigate to="/" replace />`
  - FloatingTabBar 3개 항목(홈 `/`, 순위 `/rank`, 중요도 `/weights`)이 해당 3개 화면에서만 렌더되고 현재 경로가 활성 표시, 각 항목 44x44px 이상
  - `/compare` 새로고침(직접 진입) 시 크래시 없이 홈 리다이렉트, `/offer/new` 새로고침 시 크래시 없이 `kind:'offer'` 폴백 렌더
  - 홈 → 입력 → 가중치 → 비교 → 순위 순차 이동이 전부 성공하고 뒤로가기(`navigate(-1)`)가 정상 동작
  - `npx tsc --noEmit` 및 `npm run build` 통과
- Covers: [F5-AC-5, F6-AC-2]
- Files: `src/App.tsx`, `src/routes.tsx`
- Depends on: Task 3.1, Task 3.2, Task 3.3, Task 3.4, Task 3.5, Task 3.6

### Task 4.2 홈 광고 배치 검증 + AI/계산 고지 최종 점검
- Description: 홈 배너 배치가 콘텐츠와 겹치지 않는지 확인하고, 규칙 기반 계산 고지(F2 최초 다이얼로그 / F5 결과 고지)가 실제 빌드에서 요구 문구 그대로 노출되는지 통합 검증한다.
- DoD:
  - 홈의 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`가 오퍼 목록 섹션 **아래**, SubmitFooter **위**에 위치
  - 뷰포트 375x667에서 배너의 `getBoundingClientRect()`가 모든 `data-testid="offer-card"` 사각형과 교집합 0
  - `jod.meta.v1` 삭제 후 앱 재진입 시 AlertDialog가 정확히 1회 노출되고 문구가 "이 앱의 점수와 추천은 입력값 기반 규칙 계산 결과이며 법률·세무 자문이 아닙니다"와 문자열 일치, "확인" 후 재진입 시 0회
  - 해제된 `/compare`에서 `data-testid="calc-notice"` 텍스트가 "입력값 기반 규칙 계산 결과입니다. 법률·세무 자문이 아닙니다"와 문자열 일치하고 `capture-area` 내부에 위치
  - 소스 트리에 "AI가 생성" 문구가 0건(본 앱은 생성형 AI 미사용)
- Covers: [F2-AC-4, F2-AC-8, F5-AC-8]
- Files: `src/pages/HomePage.tsx`(배치 조정만), `src/components/CompareDetail.tsx`(고지 위치 확인)
- Depends on: Task 4.1

### Task 4.3 검수 정책 가드 스크립트
- Description: F8의 토스 검수 기준을 자동 검사하는 `npm run guard` 스크립트를 작성하고, 프로덕션 빌드 런타임에서 콘솔 에러 0건을 확인한다.
- DoD:
  - `scripts/guard.mjs`가 위반 시 exit code 1로 종료하며 다음을 검사:
    - `src/**`에서 `window.open(` 0건, `window.location.href =` 에 `http://`/`https://` 대입 0건
    - `src/**/*.{ts,tsx,css}`에서 정규식 `#[0-9a-fA-F]{3,8}\b` 매칭 0건
    - `src/**`에서 `.at(`, `Object.groupBy`, `structuredClone(`, `findLast`, `:has(`, `crypto.randomUUID` 사용 0건, id 생성이 `o_${Date.now()}_${counter}` 패턴인지 확인
    - `package.json` + `index.html`에서 `google-analytics|gtag|amplitude|mixpanel|sentry` 0건
    - `package.json`에서 `@mui/|antd|@chakra-ui/|shadcn` 0건, UI import가 `@toss/tds-mobile` 또는 `src/components/*` 이외 소스에서 발생 0건
    - `src/**`에서 외부 도메인 대상 `fetch(`/`XMLHttpRequest` 0건
    - 렌더 문자열에 "앱을 설치"/"다운로드하세요"/"스토어에서" 0건, 외부 링크 0건
    - `grantPromotionReward` 호출 0건이거나, 호출 시 직전에 `amount <= 5000` 가드 코드 존재
  - `package.json`에 `"guard": "node scripts/guard.mjs"` 스크립트 추가, 현재 트리에서 `npm run guard`가 exit 0
  - `npm run build` 산출물 실행 후 홈→입력→가중치→비교→순위 순차 방문 시 `console.error` 출력 0건, 미처리 Promise rejection 0건
- Covers: [F8-AC-1, F8-AC-2, F8-AC-3, F8-AC-4, F8-AC-5, F8-AC-6, F8-AC-7, F8-AC-8]
- Files: `scripts/guard.mjs`, `package.json`
- Depends on: Task 4.1

---

## AC Coverage

- **Total ACs in SPEC**: 64 (F1~F8 × 각 8개)
- **Covered by tasks**: 64
  - F1-AC-1 (2.2), F1-AC-2 (1.1), F1-AC-3 (2.3), F1-AC-4 (2.3), F1-AC-5 (2.1), F1-AC-6 (2.1), F1-AC-7 (2.2), F1-AC-8 (2.1)
  - F2-AC-1 (3.1), F2-AC-2 (3.1), F2-AC-3 (3.1), F2-AC-4 (3.1, 4.2), F2-AC-5 (3.1), F2-AC-6 (3.1), F2-AC-7 (2.4, 3.1), F2-AC-8 (4.2)
  - F3-AC-1 (3.2), F3-AC-2 (3.2), F3-AC-3 (3.2), F3-AC-4 (3.2), F3-AC-5 (3.2), F3-AC-6 (3.2), F3-AC-7 (3.2), F3-AC-8 (3.2)
  - F4-AC-1 (3.3), F4-AC-2 (3.3), F4-AC-3 (3.3), F4-AC-4 (3.3), F4-AC-5 (3.3), F4-AC-6 (2.4, 3.3), F4-AC-7 (3.3), F4-AC-8 (3.3)
  - F5-AC-1 (3.4), F5-AC-2 (3.4), F5-AC-3 (3.4), F5-AC-4 (3.4), F5-AC-5 (3.4, 4.1), F5-AC-6 (3.4), F5-AC-7 (3.5), F5-AC-8 (3.5, 4.2)
  - F6-AC-1 (3.6), F6-AC-2 (3.6, 4.1), F6-AC-3 (3.6), F6-AC-4 (3.6), F6-AC-5 (3.6), F6-AC-6 (2.4, 3.6), F6-AC-7 (3.6), F6-AC-8 (3.6)
  - F7-AC-1 (3.5), F7-AC-2 (3.5), F7-AC-3 (3.5), F7-AC-4 (3.5), F7-AC-5 (3.5), F7-AC-6 (3.5), F7-AC-7 (3.5), F7-AC-8 (3.5)
  - F8-AC-1 (4.3), F8-AC-2 (4.3), F8-AC-3 (4.3), F8-AC-4 (4.3), F8-AC-5 (4.3), F8-AC-6 (4.3), F8-AC-7 (4.3), F8-AC-8 (4.3)
- **Uncovered**: 0

### 파일 소유권 (충돌 방지)
| 파일 | 생성/수정 태스크 |
|---|---|
| `src/lib/types.ts` | 1.1 단독 |
| `src/lib/storage.ts` | 2.1 단독 |
| `src/lib/calc.ts` | 2.2 단독 (2.3은 import만) |
| `src/lib/score.ts`, `src/lib/negotiation.ts` | 2.3 단독 |
| `src/hooks/*` | 2.4 단독 |
| `src/pages/ComparePage.tsx` | 3.4 생성 → 3.5가 slot 연결 1곳 수정 (explicit depends on 3.4) |
| `src/pages/HomePage.tsx` | 3.1 생성 → 4.2가 광고 배치만 조정 (explicit depends on 4.1) |
| 그 외 페이지 파일 | 각 1개 태스크 단독 |