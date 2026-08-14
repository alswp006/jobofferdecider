# TASK — JobOfferDecider

> 총 18 Task / 4 Epic. 각 Task는 10분 이내 완료 가능 단위.
> **라우팅 원칙**: SPEC 설계 원칙에 따라 `location.state`를 일절 사용하지 않는다. 단, 타입 계약 명시를 위해 `RouteState`를 `src/lib/types.ts`에 정의한다(모든 경로 `undefined`).

---

## Epic 1. TypeScript 타입 + 상수

**Risk Assessment**
- Complexity: Low
- Risk factors: 타입 정의 누락 시 이후 16개 패킷이 연쇄 컴파일 실패. `RouteState` 미정의 시 각 페이지가 임의 타입 재정의 → 불일치.
- Mitigation: Epic 1을 단독 선행. 런타임 코드 금지(순수 타입 + 리터럴 상수). 이후 모든 패킷이 `src/lib/types.ts`만 import.

### Task 1.1 도메인 타입 + RouteState 정의
- Description: `src/lib/types.ts`에 SPEC Data Models 전체 타입을 선언한다. `Won`, `NonMonetaryRatings`, `CompanyProfile`, `Weights`, `DEFAULT_WEIGHTS`, `MoneyBreakdown`, `VerdictLevel`, `ScoreItem`, `ScoreResult`, `AppState` 및 **RouteState**를 포함한다. 런타임 함수/클래스 금지. RouteState는 전 경로 `undefined`로 선언하고 "모든 화면 간 데이터 전달은 URL param + localStorage로만 수행한다. location.state 사용 금지" 주석을 단다. 예: `export type RouteState = { "/": undefined; "/company/current": undefined; "/company/offer/new": undefined; "/company/offer/:id": undefined; "/weights": undefined; "/result/:offerId": undefined; "/compare": undefined; };`
- DoD:
  - `npx tsc --noEmit` 에러 0개
  - `CompanyProfile` 필드 12개(id, name, baseSalary, bonusPerYear, remoteDaysPerWeek, commuteMinutesOneWay, commuteCostPerDay, lunchCostPerDay, mealSupportPerMonth, welfarePointsPerYear, ratings, updatedAt) 전부 존재
  - `NonMonetaryRatings` 5개 필드가 `1|2|3|4|5` 리터럴 유니온
  - `AppState.version`이 리터럴 타입 `1`, `ScoreResult.items`가 `ScoreItem[]`, `negotiationPoints`가 `string[]`
  - `RouteState`가 export되고 7개 경로 키를 모두 포함
  - `DEFAULT_WEIGHTS` 6개 필드 전부 `50`으로 export
  - `calcScore` 시그니처가 `ScoreResult | null`을 표현 가능하도록 타입이 nullable 조합 가능
- Covers: [F1-AC-2, F1-AC-8]
- Files: [src/lib/types.ts]
- Depends on: none

### Task 1.2 상수 테이블 정의
- Description: `src/lib/constants.ts`에 `TAX_TABLE`(6구간), `TIME_VALUE_PER_HOUR = 15_000`, `MAX_OFFERS = 3`, `STORAGE_KEY = 'jod:state:v1'`, `ONBOARDED_KEY = 'jod:onboarded:v1'`, `INITIAL_STATE: AppState`, `SCORE_LABELS: Record<ScoreItem['key'], string>`(money="연봉 실질가치", growth="성장성", workLife="워라밸", stability="안정성", culture="조직문화", commuteEase="통근 편의"), `VERDICT_LABELS: Record<VerdictLevel, string>`(MOVE="이직 추천", CONDITIONAL="조건부 추천", HOLD="판단 보류", STAY="잔류 추천")을 선언한다.
- DoD:
  - `TAX_TABLE`이 `ReadonlyArray<{upTo: Won; rate: number}>` 6개 원소, 마지막 `upTo === Infinity && rate === 0.31`, 첫 원소 `{24_000_000, 0.09}`
  - `INITIAL_STATE`가 `{ version: 1, current: null, offers: [], weights: DEFAULT_WEIGHTS, unlockedOfferIds: [] }`와 깊은 동등
  - `SCORE_LABELS` 키 6개, `VERDICT_LABELS` 키 4개 전부 존재하며 값이 SPEC 문구와 동일 문자열
  - `MAX_OFFERS === 3`, `TIME_VALUE_PER_HOUR === 15000`
  - HEX 색상 리터럴 0건, `npx tsc --noEmit` 에러 0개
- Covers: [F1-AC-1, F1-AC-4, F2-AC-6]
- Files: [src/lib/constants.ts]
- Depends on: Task 1.1

---

## Epic 2. Data Layer (storage / calc / state)

**Risk Assessment**
- Complexity: Medium
- Risk factors: (1) `Math.round` 적용 순서가 다르면 AC-1의 `4_161_000` 기대값 불일치. (2) 손상 JSON·QuotaExceeded 미처리 시 화이트스크린. (3) `console.error` 사용 시 F8 검수 반려. (4) 타 미니앱과 오리진 공유 시 localStorage Quota 예외 가능(자체 사용량은 2KB로 여유).
- Mitigation: storage(2.1) → calcMoney(2.2) → calcScore(2.3) → verdict(2.4) → state hook(2.5)로 5분할해 단일 책임 유지. 각 DoD에 SPEC 수치 기대값을 그대로 명시. catch는 전부 silent + 기본값 반환으로 통일.

### Task 2.1 localStorage 저장소 모듈
- Description: `src/lib/storage.ts`에 `loadState(): AppState`, `saveState(state: AppState): boolean`, `isValidAppState(raw: unknown): raw is AppState`, `migrate(raw: unknown): AppState`, `isOnboarded(): boolean`, `setOnboarded(): void`를 구현한다. 모든 함수는 예외를 밖으로 던지지 않고 catch 블록에서 `console.error`를 호출하지 않는다.
- DoD:
  - `localStorage['jod:state:v1'] = '{broken json'` 후 `loadState()` → `INITIAL_STATE`와 깊은 동등 객체 반환, 예외 0건, `console.error` 호출 0회
  - `localStorage.setItem`이 `QuotaExceededError`를 던지도록 mock → `saveState(s)`가 `false` 반환, 예외 전파 0건
  - 정상 환경 `saveState(s)` → `true` 반환, `JSON.parse(localStorage['jod:state:v1']).version === 1`
  - `version !== 1` 객체 주입 후 `loadState()` → `INITIAL_STATE` 반환
  - `isValidAppState({version:1,current:null,offers:[],weights:DEFAULT_WEIGHTS,unlockedOfferIds:[]}) === true`, `isValidAppState(null) === false`
  - `isOnboarded()` 최초 `false` → `setOnboarded()` 후 `localStorage['jod:onboarded:v1'] === "1"` 이고 `isOnboarded() === true`
- Covers: [F1-AC-5, F1-AC-6, F8-AC-1]
- Files: [src/lib/storage.ts]
- Depends on: Task 1.1, Task 1.2

### Task 2.2 금전 실질가치 계산 (calcMoney)
- Description: `src/lib/calc.ts`에 `getTaxRate(grossAnnual: Won): number`와 `calcMoney(profile: CompanyProfile): MoneyBreakdown`을 순수 함수로 구현한다. 계산 순서는 SPEC MoneyBreakdown 주석 그대로이며 `netMonthlyValue = netMonthlySalary + monthlyBenefit − monthlyCommuteCost − monthlyLunchCost − monthlyCommuteTimeCost`. 모든 금액은 `Math.round` 정수화.
- DoD:
  - SPEC F1-AC-1 입력값으로 호출 시 `officeDaysPerMonth === 12`, `grossAnnual === 66000000`, `effectiveTaxRate === 0.21`, `netMonthlySalary === 4345000`, `monthlyBenefit === 200000`, `monthlyCommuteCost === 36000`, `monthlyLunchCost === 108000`, `monthlyCommuteTimeCost === 240000`, `netMonthlyValue === 4161000` — 9개 값 전부 일치
  - `getTaxRate(24000000) === 0.09`, `getTaxRate(24000001) === 0.13`, `getTaxRate(999999999) === 0.31`
  - `remoteDaysPerWeek: 5` → `officeDaysPerMonth === 0` 이고 통근비·점심값·시간비용 전부 `0`
  - `effectiveTaxRate`를 제외한 전 반환 필드가 `Number.isInteger === true`
  - 함수 내부에서 localStorage / Date / Math.random 접근 0건
- Covers: [F1-AC-1]
- Files: [src/lib/calc.ts]
- Depends on: Task 1.1, Task 1.2

### Task 2.3 점수 산출 (calcScore)
- Description: `src/lib/score.ts`에 `normalizeWeights(w: Weights): Record<keyof Weights, number>`(합 0이면 `DEFAULT_WEIGHTS` 대체, 비율 소수 4자리 반올림)와 `calcScore(current: CompanyProfile | null, offer: CompanyProfile, weights: Weights): ScoreResult | null`을 구현한다. money 점수는 current 고정 50, offer는 `clamp(Math.round(50 + (offerNet − currentNet) / currentNet * 200), 0, 100)`. 비금전 5항목은 `rating * 20`. 총점은 `Math.round(Σ score × weightRatio)`. `current === null`이면 `null` 반환. verdict/verdictLabel/negotiationPoints는 placeholder(`'HOLD'`, `''`, `[]`)로 두고 Task 2.4가 채운다.
- DoD:
  - `weights={money:100,growth:50,workLife:50,stability:0,culture:0,commuteEase:0}` → `items.length === 6`, `weightRatio` 합이 소수 4자리 반올림 기준 `1.0000`, stability·culture·commuteEase의 `weightRatio === 0`
  - 같은 케이스에서 `currentTotal`/`offerTotal`이 정수이고 `0 <= v <= 100`
  - `weights` 6개 전부 `0` → 내부적으로 `DEFAULT_WEIGHTS` 사용, 각 `weightRatio === 0.1667`
  - `currentNet=4000000`, `offerNet=4400000` 프로필 쌍 → money 항목 `offerScore === 70`, `currentScore === 50`
  - `offerNet`이 10배여도 `offerScore <= 100`, 1/10이어도 `>= 0`
  - `calcScore(null, offer, weights) === null`, 예외 0건
  - `items[i].label`이 `SCORE_LABELS` 값으로 채워져 빈 문자열 0건
- Covers: [F1-AC-2, F1-AC-3, F1-AC-7, F1-AC-8]
- Files: [src/lib/score.ts]
- Depends on: Task 2.2

### Task 2.4 판정 & 협상 포인트 (getVerdict)
- Description: `src/lib/verdict.ts`에 `getVerdictLevel(diff: number): VerdictLevel`, `buildNegotiationPoints(items: ScoreItem[]): string[]`, `getVerdict(result: ScoreResult): ScoreResult`를 구현한다. 협상 포인트는 `offerScore < currentScore` 항목을 점수 차 내림차순 선택하고 3개 미만이면 고정 템플릿("연봉 인상 폭을 세후 기준으로 재확인하세요", "사이닝 보너스 또는 스톡 조건을 문의하세요", "재택 근무 일수 확대 가능 여부를 확인하세요")으로 채운다. 규칙 기반 순수 함수(CP-7), LLM 호출 0건.
- DoD:
  - `getVerdictLevel(10)==='MOVE'`, `(9)==='CONDITIONAL'`, `(3)==='CONDITIONAL'`, `(2)==='HOLD'`, `(-3)==='HOLD'`, `(-4)==='STAY'` 6개 경계값 일치
  - `currentTotal=62, offerTotal=74` 입력 → `verdict==='MOVE'`, `verdictLabel==='이직 추천'`
  - 반환 `negotiationPoints.length === 3` (항상), 각 문자열 길이 1~60, 중복 0건
  - 열세 항목 5개 입력 → 점수 차 내림차순 상위 3개만 선택(4·5위 미포함)
  - 열세 항목 0개 입력 → 고정 템플릿 3개 반환
  - 소스에 `fetch`, `openai`, `anthropic` 문자열 0건
- Covers: [F1-AC-4]
- Files: [src/lib/verdict.ts]
- Depends on: Task 2.3

### Task 2.5 앱 상태 훅 (useAppState)
- Description: `src/hooks/useAppState.ts`에 `useAppState()`를 구현한다. 반환: `{ state, loading, saveError, saveCurrent, saveOffer, deleteOffer, saveWeights, unlockOffer }`. 마운트 시 `loadState()` 1회 → `loading=false`. 모든 mutation은 React state 갱신 + `saveState()` 호출, `saveState`가 `false`면 `saveError=true`로 세팅해 호출부가 Toast를 띄우게 한다. 신규 오퍼 id는 `crypto.randomUUID()`(미지원 시 v4 포맷 폴백), `deleteOffer`는 `unlockedOfferIds`에서도 제거, `MAX_OFFERS` 초과 시 추가 거부.
- DoD:
  - 마운트 직후 `loading === true`, 로드 완료 후 `loading === false` 이고 `state`가 `AppState` 형태
  - `saveCurrent(profile)` → `state.current.id === 'current'`, `updatedAt`이 ISO8601, localStorage 반영
  - `saveOffer(newProfile)` → `offers.length` 1 증가, id가 `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/` 매칭
  - `offers.length === 3`에서 `saveOffer(new)` → 추가 0건, `false` 반환
  - `deleteOffer('o-1')` → `offers`와 `unlockedOfferIds` 양쪽에서 `'o-1'` 제거
  - `unlockOffer('o-1')` 2회 호출 → `unlockedOfferIds` 내 `'o-1'` 1개만 유지
  - `saveState`가 `false`인 환경에서 mutation → `saveError === true`, 예외 전파 0건, `console.error` 0회
- Covers: [F1-AC-6, F2-AC-6, F4-AC-3, F5-AC-1]
- Files: [src/hooks/useAppState.ts]
- Depends on: Task 2.1

---

## Epic 3. 코어 UI 페이지

**Risk Assessment**
- Complexity: High
- Risk factors: (1) TDS 컴포넌트에 Tailwind/인라인 padding 오버라이드 시 검수 즉시 반려. (2) HEX 하드코딩 1건으로 F8-AC-5 실패. (3) 잘못된 `offerId` 직접 진입 시 `.map()` 크래시(2026-08-03 SplitMate 실사고 유형). (4) 한 패킷에 여러 페이지를 넣으면 10분 초과.
- Mitigation: 1 Task = 1 페이지로 강제 분할, 폼은 검증 로직(3.1)/화면(3.2) 분리, 결과 화면은 공개부(3.6)/게이트부(3.7) 분리. 모든 페이지 DoD에 "state 없이 직접 URL 진입해도 크래시하지 않는다"를 명시.

### Task 3.1 폼 유효성 검증 + 숫자 입력 유틸
- Description: `src/lib/validation.ts`에 `sanitizeNumeric(raw: string): string`, `formatWithComma(v: string): string`, `validateProfile(draft): Record<string, string>`(에러 없으면 `{}`)와 각 숫자 필드 상·하한 상수를 구현한다. 에러 문구는 SPEC 그대로: `"회사명을 입력해주세요"`, `"연봉은 1원 이상 5억원 이하로 입력해주세요"`.
- DoD:
  - `sanitizeNumeric("6천만원")==="6"`, `sanitizeNumeric("60,000,000")==="60000000"`, `sanitizeNumeric("-5")==="5"`
  - `formatWithComma("60000000")==="60,000,000"`, `formatWithComma("6")==="6"`, `formatWithComma("")===""`
  - `validateProfile({name:"",baseSalary:60000000,...})` 결과에 `name: "회사명을 입력해주세요"` 포함
  - `baseSalary:0`과 `baseSalary:500000001` 두 경우의 `baseSalary` 에러가 **동일 문자열** `"연봉은 1원 이상 5억원 이하로 입력해주세요"`
  - 유효 입력 → `{}` 반환
  - `remoteDaysPerWeek: 6` → 에러 반환, `commuteMinutesOneWay: 181` → 에러 반환
- Covers: [F2-AC-3, F2-AC-4, F2-AC-5]
- Files: [src/lib/validation.ts]
- Depends on: Task 1.1

### Task 3.2 회사 정보 입력 페이지 (S2)
- Description: `src/pages/CompanyFormPage.tsx`를 구현한다. `useParams`로 모드 결정(`/company/current` / `:id==='new'` / 편집). `ScreenScaffold` + TDS Top + `SubmitFooter`, 섹션 3개를 `Spacing size={24}`로 구분. 숫자 TextField 7개는 `type="text" inputMode="numeric"` + `sanitizeNumeric`/`formatWithComma`. 만족도 5행은 TDS Chip 1~5. 저장 시 `validateProfile` → 에러면 첫 에러 필드 `focus()`, 통과면 `saveCurrent`/`saveOffer` 후 Toast + `navigate('/', { replace: true })`.
- DoD:
  - `/company/offer/new` 진입 시 숫자 필드 전부 빈 문자열, 연봉 placeholder `"예) 60000000"`, ratings 5개 Chip이 각각 `3` 선택, "저장" 버튼 `disabled === true`
  - 회사명 + 연봉 입력 시 "저장" 버튼 `disabled === false`
  - 회사명 빈 상태 저장 → 저장 0건, `"회사명을 입력해주세요"` 렌더, `document.activeElement`가 회사명 input
  - `baseSalary` 0 또는 500000001 저장 → 두 경우 동일 문자열 `"연봉은 1원 이상 5억원 이하로 입력해주세요"` 렌더
  - 연봉 필드에 `"6천만원"` 입력 → 표시값 `"6"`
  - SPEC F2-AC-1 값으로 `/company/current` 저장 → `localStorage['jod:state:v1'].current.id === "current"`, Toast `"현재 직장 정보를 저장했어요"`, `/`로 이동
  - `/company/offer/new` 저장 → `offers`에 UUID v4 id 1개 추가, Toast `"오퍼를 저장했어요"`, `/`로 이동
  - 숫자 TextField 전부 `inputMode="numeric"` 보유, 스크롤 컨테이너 하단 여백 ≥ 88px로 SubmitFooter 미가림
  - Chip·Button 높이 ≥ 44px, TextField 높이 ≥ 48px
  - `useLocation().state` 참조 0건 — `/company/offer/zzz` 직접 진입 시 크래시 없이 신규 폼 또는 홈 리다이렉트로 폴백
  - TDS padding/margin 오버라이드 0건, HEX 리터럴 0건, `data-testid="company-form"` 존재
- Covers: [F2-AC-1, F2-AC-2, F2-AC-3, F2-AC-4, F2-AC-5, F2-AC-7, F2-AC-8]
- Files: [src/pages/CompanyFormPage.tsx]
- Depends on: Task 2.5, Task 3.1

### Task 3.3 WeightSlider 컴포넌트
- Description: `src/components/WeightSlider.tsx`와 `src/components/WeightSlider.css`를 구현한다(CP-6). 네이티브 `<input type="range" min=0 max=100 step=1>` 래퍼, props `{ label, value, ratioText, onChange }`. 라벨/비율은 TDS `Paragraph.Text`, 색상은 `var(--tds-color-blue-500)` / `var(--tds-color-grey-200)`만 사용, thumb 히트영역 44×44px.
- DoD:
  - 두 파일 전체에 `/#[0-9a-fA-F]{3,8}\b/` 매칭 0건
  - CSS에 `::-webkit-slider-thumb`와 `::-moz-range-thumb` 규칙 모두 존재, 히트영역 ≥ 44×44px
  - 드래그 시 `onChange`가 0~100 정수로 호출됨
  - 라벨/비율이 TDS `Paragraph.Text`로 렌더(raw 텍스트 노드 0건)
  - `npx tsc --noEmit` 에러 0개
- Covers: [F3-AC-7, F3-AC-8]
- Files: [src/components/WeightSlider.tsx, src/components/WeightSlider.css]
- Depends on: Task 1.1

### Task 3.4 중요도 설정 페이지 (S3)
- Description: `src/pages/WeightsPage.tsx`를 구현한다. `ScreenScaffold` + TDS Top(title="중요도 설정", 우측 "초기화") + `SubmitFooter`("저장", `display="block"`). `data-testid="weight-list"` 내 `WeightSlider` 6행, 행 간 `Spacing size={16}`. 우측에 정규화 비율 %(`Math.round(v/sum*100)`, 합 0이면 전부 `"0%"`) 실시간 표시. 저장 시 전부 0이면 AlertDialog, 저장 실패 시 Toast, 성공 시 Toast + `navigate(-1)`.
- DoD:
  - `{money:100,growth:50,workLife:50,stability:0,culture:0,commuteEase:0}` → money `"50%"`, growth·workLife 각 `"25%"`, 나머지 3개 `"0%"`
  - money=100, growth=80 저장 → `localStorage['jod:state:v1'].weights.money===100 && .growth===80`, Toast `"중요도를 저장했어요"`, `navigate(-1)` 호출
  - "초기화" 탭 → 6개 값 전부 `50`, 각 비율 `"17%"`
  - 6개 전부 0으로 저장 → 저장 0건, AlertDialog `"중요도를 하나 이상 0보다 크게 설정해주세요"` 렌더
  - `saveState`가 false인 환경 저장 → Toast `"저장 공간이 부족해요. 오퍼를 하나 삭제해주세요"`, 화면 이동 0건
  - `loading === true` 동안 Skeleton 6줄 + "저장" `disabled === true`, 로드 완료 후 200ms 이내 실제 슬라이더로 교체
  - "초기화" 버튼 히트영역 ≥ 44×44px
  - `useLocation().state` 참조 0건 — `/weights` 직접 진입 시 정상 렌더
  - HEX 리터럴 0건, TDS padding 오버라이드 0건
- Covers: [F3-AC-1, F3-AC-2, F3-AC-3, F3-AC-4, F3-AC-5, F3-AC-6]
- Files: [src/pages/WeightsPage.tsx]
- Depends on: Task 2.5, Task 3.3

### Task 3.5 홈 페이지 (S1)
- Description: `src/pages/HomePage.tsx`를 구현한다. `ScreenScaffold` + TDS Top(title="이직 결정하기"). 구성: `data-testid="current-card"` TDS Card(월 실질가치 `t2`) → `data-testid="offer-list"` ListRow 목록 → `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` → `FloatingTabBar`. 각 행 우측에 차액을 `"+41만원/월"` 형식으로 표시(만원 단위 반올림, 부호 포함, 0 이상 blue-500 / 음수 red-500). 행 탭 → `navigate('/result/' + offer.id)`. 삭제는 AlertDialog 확인 후 `deleteOffer`. 빈 상태 2종 + 로딩 Skeleton + `MAX_OFFERS` 초과 AlertDialog.
- DoD:
  - `current !== null && offers.length === 2` → ListRow 정확히 2개, 각 행 우측 텍스트가 `/^[+-]\d+만원\/월$/` 매칭
  - 차액 ≥ 0 행 색상이 `var(--tds-color-blue-500)`, 음수 행이 `var(--tds-color-red-500)` (HEX 0건)
  - id `"o-1"` 행 탭 → `navigate('/result/o-1')` 호출
  - 삭제 탭 → AlertDialog `"'A사' 오퍼를 삭제할까요?"`, "삭제" 시 `offers.length` 1 감소 + `unlockedOfferIds`에서 제거 + Toast `"삭제했어요"`
  - `current === null` → `data-testid="empty-current"`에 `Asset.ContentIcon` + `"먼저 현재 직장 정보를 입력해주세요"` + `display="block"` Button `"현재 직장 입력하기"`만 렌더, `offer-list`·"비교하기" 렌더 0건
  - `current !== null && offers.length === 0` → `data-testid="empty-offers"`에 `Asset.ContentIcon` + `"비교할 오퍼를 추가해보세요"` + `display="block"` Button `"오퍼 추가"`
  - `offers.length === 3`에서 "오퍼 추가" 탭 → `navigate` 호출 0건, AlertDialog `"오퍼는 최대 3개까지 비교할 수 있어요"`(확인 버튼 1개만)
  - `loading === true` → Skeleton 카드 1 + 행 2 렌더
  - `AdSlot`이 DOM 순서상 `offer-list` 뒤 · `FloatingTabBar` 앞, ListRow와 겹침 0건, 광고 실패 시 영역 height 0 + 에러 문구 0건
  - ListRow·Button 높이 ≥ 44px, 삭제 버튼 히트영역 44×44px
  - `useLocation().state` 참조 0건, `ScreenScaffold` 사용(raw div 골격 0건)
- Covers: [F2-AC-6, F4-AC-1, F4-AC-2, F4-AC-3, F4-AC-4, F4-AC-5, F4-AC-6, F4-AC-7, F4-AC-8]
- Files: [src/pages/HomePage.tsx]
- Depends on: Task 2.2, Task 2.5

### Task 3.6 결과 화면 — 공개 영역 & SummaryHero (S4 전반부)
- Description: `src/pages/ResultPage.tsx`의 광고 게이트 밖 영역을 구현한다. `useParams<{offerId:string}>`로 오퍼 조회 → 없으면 `data-testid="not-found"`. `ScreenScaffold` + TDS Top(title=오퍼명, 좌측 back). `data-testid="net-diff-hero"` SummaryHero(CountUp, `"+410,000원"` 형식) → `data-testid="strategy-card"` TDS Card 정확히 2개(각 월 실질가치 `t2` + 세부 5줄) → 고지 문구 `Paragraph.Text` → `<AdSlot />`. 게이트 영역 자리는 Task 3.7이 채운다. 로딩 Skeleton(hero 1 + card 2) 포함.
- DoD:
  - `/result/o-99`(존재하지 않는 id) 직접 진입 → `data-testid="not-found"`에 `"오퍼를 찾을 수 없어요"` + `display="block"` Button `"홈으로"`, 탭 시 `navigate('/', { replace: true })`. 크래시·화이트스크린 0건
  - `location.state === undefined`(새로고침/딥링크)로 `/result/o-1` 진입 시 정상 렌더 — 소스에 `useLocation().state` 참조 0건
  - `data-testid="strategy-card"` 요소 개수 정확히 2, 각 카드 월 실질가치 `t2`, 세부 5줄(세후급여/복지/교통비/점심/시간비용) 전부 렌더
  - `data-testid="net-diff-hero"` 텍스트가 `/^[+-][\d,]+원$/` 매칭, CountUp 종료 후 최종값이 `offerNet − currentNet`과 일치
  - `current === null` → 계산 불가 안내 렌더, undefined 배열에 `.map()` 호출로 인한 예외 0건
  - 계산 완료 전 Skeleton hero 1 + card 2 렌더, 완료 시 실제 값 교체
  - 고지 문구 `"규칙 기반 계산 결과이며 재무·커리어 자문이 아닙니다. 세금은 구간별 근사치입니다"` 렌더, `<AdSlot />`이 DOM 순서상 그 아래 위치하며 결과 카드와 겹침 0건
  - back 버튼 히트영역 44×44px, HEX 리터럴 0건
- Covers: [F5-AC-4, F5-AC-7, F5-AC-8, F5-AC-9]
- Files: [src/pages/ResultPage.tsx]
- Depends on: Task 2.4, Task 2.5

### Task 3.7 결과 화면 — 리워드 게이트 & 분석표 (S4 후반부)
- Description: `ResultPage`에 게이트 영역을 추가하고 `src/components/ScoreTable.tsx`(6행 + MiniBar), `src/components/VerdictCard.tsx`, `src/components/NegotiationCard.tsx`를 신규 구현한다. 미해금 시 `display="block"` Button "분석 결과 보기"를 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 게이트하고 시청 완료 시 `unlockOffer(offerId)` 후 상세 표시. 이미 해금이면 즉시 표시. 광고 실패 시 Toast + 버튼 재활성화. `data-testid="capture-area"`가 verdict-card + score-table + negotiation-card를 감싼다(AdSlot·고지문구 제외).
- DoD:
  - `unlockedOfferIds`에 `"o-1"` 없음 → `score-table`/`verdict-card`/`negotiation-card` 렌더 0건, "분석 결과 보기" Button 렌더
  - 광고 시청 완료 → 3개 testid 전부 렌더, `localStorage['jod:state:v1'].unlockedOfferIds`에 `"o-1"` 포함
  - `"o-1"` 해금 상태 진입 → 3개 testid 즉시 렌더, "분석 결과 보기" Button 렌더 0건
  - `data-testid="score-table"` 내 행 정확히 6개, 각 행에 label·현재 점수·오퍼 점수·MiniBar 존재
  - 합계 행에 `"62점"`/`"74점"` 표시, 판정 Chip 텍스트 `"이직 추천"`
  - `data-testid="negotiation-card"` 내 ListRow 정확히 3개, 각 행이 번호(1/2/3) + 문구 포함
  - 광고 로드 실패/중도 종료 → 상세 렌더 0건, Toast `"광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"`, `unlockedOfferIds` 변경 0건, 버튼 재tappable
  - `capture-area` 하위에 `AdSlot`·고지 문구 미포함(querySelector 검증)
  - "분석 결과 보기" 버튼 높이 56px, HEX 리터럴 0건
- Covers: [F5-AC-1, F5-AC-2, F5-AC-3, F5-AC-5, F5-AC-6, F7-AC-6]
- Files: [src/pages/ResultPage.tsx, src/components/ScoreTable.tsx, src/components/VerdictCard.tsx, src/components/NegotiationCard.tsx]
- Depends on: Task 3.6

### Task 3.8 오퍼 비교 페이지 (S5)
- Description: `src/pages/ComparePage.tsx`를 구현한다. `ScreenScaffold` + TDS Top(title="한눈에 비교") + `FloatingTabBar`. `data-testid="compare-grid"`는 CSS grid(`grid-template-columns: repeat(var(--cols), 1fr)`, 최대 4열, 가로 스크롤 금지). 행 8개(월 실질가치 + 종합 점수 + 세부 6개), 각 행 최고값 셀에 TDS Chip `"최고"` 1개(동점 시 좌측 1개만). 종합 점수 최고 셀은 `t3` + `data-testid="compare-best-total"`. 미해금 열의 세부 6셀은 `"?"` 마스킹 + 하단 "결과 보기" Button. 열 헤더 탭 → `navigate('/result/' + id)`. 빈 상태 2종 + 로딩 Skeleton.
- DoD:
  - `current !== null && offers.length === 3` → 열 4개 · 행 8개 렌더, 각 행의 `"최고"` Chip 개수 정확히 1(동점 케이스 포함)
  - 종합 점수 `62/74/68/59` → A사 셀이 `t3` 타이포이고 `data-testid="compare-best-total"` 보유
  - `"o-1"` 열 헤더 탭 → `navigate('/result/o-1')` 호출
  - `offers.length <= 1` → `data-testid="empty-compare"`에 `Asset.ContentIcon` + `"오퍼를 2개 이상 등록하면 비교할 수 있어요"` + `display="block"` Button `"오퍼 추가"`, 그리드 렌더 0건
  - `unlockedOfferIds`에 `"o-2"` 없음 → 해당 열 세부 6셀 전부 `"?"`, 월 실질가치·종합 점수는 실제 값, 하단 `"결과 보기"` 탭 시 `navigate('/result/o-2')`
  - `current === null` → `"먼저 현재 직장 정보를 입력해주세요"` + Button `"현재 직장 입력하기"`(탭 시 `navigate('/company/current')`), 그리드 렌더 0건
  - `loading === true` → 4열×8행 Skeleton 그리드 렌더
  - `scrollWidth <= clientWidth`(가로 스크롤 0건), 열 헤더·"결과 보기" 높이 ≥ 44px
  - `useLocation().state` 참조 0건 — `/compare` 직접 진입 시 크래시 0건, HEX 리터럴 0건
- Covers: [F6-AC-1, F6-AC-2, F6-AC-3, F6-AC-4, F6-AC-5, F6-AC-6, F6-AC-7, F6-AC-8]
- Files: [src/pages/ComparePage.tsx]
- Depends on: Task 2.4, Task 2.5

---

## Epic 4. 통합 & 검수 컴플라이언스

**Risk Assessment**
- Complexity: Medium
- Risk factors: (1) 라우트 누락 시 화면 도달 불가. (2) `*` catch-all 미등록 시 잘못된 URL에서 빈 화면. (3) `html-to-image` 실패 미처리 시 `console.error` 발생 → F8-AC-3 반려. (4) HEX·외부링크·최신 문법 스캔은 전 소스 완성 후에만 유효.
- Mitigation: 라우팅(4.1) → 이미지 저장(4.2) → 온보딩/ErrorBoundary(4.3) → 컴플라이언스 스캔(4.4) 순서로 배치해 스캔 패킷이 항상 마지막에 오게 함.

### Task 4.1 라우터 배선 + FloatingTabBar 연결
- Description: `src/App.tsx`에 `BrowserRouter` + `Routes`를 구성한다. 7개 경로(`/`, `/company/current`, `/company/offer/new`, `/company/offer/:id`, `/weights`, `/result/:offerId`, `/compare`) + `*` → `<Navigate to="/" replace />`. `FloatingTabBar`는 홈/비교/중요도 3탭으로 구성하고 현재 경로에 따라 활성 표시.
- DoD:
  - 7개 경로 직접 URL 진입 시 각 페이지 렌더, 크래시 0건
  - `/nonexistent` 진입 → `/`로 replace 리다이렉트
  - `/company/offer/new`와 `/company/offer/:id`가 서로 다른 모드로 동작(매칭 충돌 0건)
  - FloatingTabBar 탭 → 각각 `navigate('/')`, `navigate('/compare')`, `navigate('/weights')`
  - `grep -rE "navigate\([^)]*,\s*\{[^}]*state" src/` → 0건(location.state 전달 0건)
  - `npm run build` 성공, `npx tsc --noEmit` 에러 0개
- Covers: [F4-AC-2, F5-AC-7, F6-AC-3]
- Files: [src/App.tsx]
- Depends on: Task 3.2, Task 3.4, Task 3.5, Task 3.7, Task 3.8

### Task 4.2 결과 이미지 저장 (F7)
- Description: `src/lib/saveImage.ts`에 `saveCaptureAsPng(el: HTMLElement, fileName: string): Promise<'ok'|'unsupported'|'failed'>`를 구현하고 `ResultPage`에 "이미지로 저장" Button을 연결한다. `html-to-image`의 `toPng`로 `data-testid="capture-area"` 변환, 배경색은 `getComputedStyle(document.body).backgroundColor`에서 취득. Blob URL + `<a download>` 후 `URL.revokeObjectURL`. `'download' in document.createElement('a')`가 false면 `'unsupported'` 반환(`window.open` 호출 금지). 실패 시 `console.error` 없이 `'failed'` 반환.
- DoD:
  - 해금 상태에서 "이미지로 저장" 탭 → `toPng` 호출, 파일명이 `/^joboffer-.+-\d{8}\.png$/` 매칭, Toast `"이미지를 저장했어요"`
  - 미해금 상태 → "이미지로 저장" Button 렌더 0건
  - 변환 중 → Button `disabled === true` + 로딩 인디케이터 + 라벨 `"저장 중..."`, 완료/실패 후 `"이미지로 저장"` 복귀
  - `toPng` reject mock → Toast `"이미지 저장에 실패했어요. 스크린샷으로 저장해주세요"`, `console.error` 0회, `navigate` 호출 0건
  - `download` 미지원 mock → Toast `"이 환경에서는 저장할 수 없어요. 스크린샷으로 저장해주세요"`, `window.open` 호출 0회
  - 성공 경로에서 `URL.revokeObjectURL` 정확히 1회 호출
  - 두 파일에 HEX 리터럴 0건(배경색은 `getComputedStyle`로만 취득)
  - `package.json` dependencies에 `html-to-image` 추가됨
- Covers: [F7-AC-1, F7-AC-2, F7-AC-3, F7-AC-4, F7-AC-5, F7-AC-7, F7-AC-8]
- Files: [src/lib/saveImage.ts, src/pages/ResultPage.tsx, package.json]
- Depends on: Task 3.7

### Task 4.3 온보딩 안내 + ErrorBoundary
- Description: `src/components/OnboardingDialog.tsx`(TDS AlertDialog)와 `src/components/ErrorBoundary.tsx`를 구현하고 `App.tsx`에 배선한다. 홈 진입 시 `isOnboarded()`가 false면 1회 표시, "확인" 탭 시 `setOnboarded()`. ErrorBoundary는 최상위에서 렌더 예외를 포착해 "일시적인 오류가 발생했어요" + `display="block"` Button "홈으로"를 표시하며 `componentDidCatch`에서 `console.error`를 호출하지 않는다.
- DoD:
  - `jod:onboarded:v1` 없는 상태로 `/` 진입 → AlertDialog `"이 앱의 판정은 입력값에 대한 규칙 기반 계산 결과이며, 세금은 구간별 근사치입니다"` 1회 렌더
  - "확인" 탭 → `localStorage['jod:onboarded:v1'] === "1"`, 다이얼로그 닫힘
  - 리마운트 재진입 시 다이얼로그 렌더 0건
  - 하위 컴포넌트 throw mock → 화이트스크린 없이 `"일시적인 오류가 발생했어요"` + Button `"홈으로"` 렌더, `console.error` 0회
  - "홈으로" 탭 → `/`로 이동하고 에러 상태 리셋
- Covers: [F8-AC-1, F8-AC-3]
- Files: [src/components/OnboardingDialog.tsx, src/components/ErrorBoundary.tsx, src/App.tsx]
- Depends on: Task 2.1, Task 4.1

### Task 4.4 검수 컴플라이언스 스캔 & 빌드 타깃 고정
- Description: `vite.config.ts`에 `build.target = 'es2018'`을 설정하고 `package.json`에 `scripts.compliance`(grep 기반 스캔)를 추가한 뒤 전 소스에 실행해 위반 0건을 만든다. 스캔 항목: HEX 색상, 외부 URL 이탈, 앱 설치 유도 문구, 외부 분석 SDK, 미지원 API, `grantPromotionReward`, `console.error`, 외부 네트워크 호출.
- DoD:
  - `vite.config.ts`에 `build: { target: 'es2018' }` 존재
  - `grep -rE "#[0-9a-fA-F]{3,8}\b" src/` → 0건
  - `grep -rE "window\.location\.href\s*=|window\.open\(|<a href=\"http|target=\"_blank\"" src/` → 0건
  - `grep -rE "설치|다운로드|앱스토어|플레이스토어" src/` → 0건
  - `grep -rE "analytics|amplitude|gtag|mixpanel" package.json` → dependencies 내 0건
  - `npm run build` 후 `grep -rE "structuredClone\(|\.at\(|Object\.groupBy|findLast" dist/` → 0건
  - `grep -r "grantPromotionReward" src/` → 0건, `grep -r "console.error" src/` → 0건
  - `grep -rE "fetch\(|XMLHttpRequest" src/` → 외부 도메인 호출 0건이며, 프로덕션 번들로 홈 → 입력 → 가중치 → 결과 → 비교 순회 시 Network 탭에 외부 도메인 요청 0건 · CORS 에러 0건 · `console.error` 0회
- Covers: [F8-AC-2, F8-AC-3, F8-AC-4, F8-AC-5, F8-AC-6, F8-AC-7, F8-AC-8]
- Files: [vite.config.ts, package.json]
- Depends on: Task 4.1, Task 4.2, Task 4.3

---

## AC Coverage

- Total ACs in SPEC: 65 (F1:8, F2:8, F3:8, F4:8, F5:9, F6:8, F7:8, F8:8)
- Covered by tasks: 65
  - F1-AC-1 → Task 1.2, 2.2
  - F1-AC-2 → Task 1.1, 2.3
  - F1-AC-3 → Task 2.3
  - F1-AC-4 → Task 1.2, 2.4
  - F1-AC-5 → Task 2.1
  - F1-AC-6 → Task 2.1, 2.5
  - F1-AC-7 → Task 2.3
  - F1-AC-8 → Task 1.1, 2.3
  - F2-AC-1 → Task 3.2
  - F2-AC-2 → Task 3.2
  - F2-AC-3 → Task 3.1, 3.2
  - F2-AC-4 → Task 3.1, 3.2
  - F2-AC-5 → Task 3.1, 3.2
  - F2-AC-6 → Task 1.2, 2.5, 3.5
  - F2-AC-7 → Task 3.2
  - F2-AC-8 → Task 3.2
  - F3-AC-1 → Task 3.4
  - F3-AC-2 → Task 3.4
  - F3-AC-3 → Task 3.4
  - F3-AC-4 → Task 3.4
  - F3-AC-5 → Task 3.4
  - F3-AC-6 → Task 3.4
  - F3-AC-7 → Task 3.3
  - F3-AC-8 → Task 3.3
  - F4-AC-1 → Task 3.5
  - F4-AC-2 → Task 3.5, 4.1
  - F4-AC-3 → Task 2.5, 3.5
  - F4-AC-4 → Task 3.5
  - F4-AC-5 → Task 3.5
  - F4-AC-6 → Task 3.5
  - F4-AC-7 → Task 3.5
  - F4-AC-8 → Task 3.5
  - F5-AC-1 → Task 2.5, 3.7
  - F5-AC-2 → Task 3.7
  - F5-AC-3 → Task 3.7
  - F5-AC-4 → Task 3.6
  - F5-AC-5 → Task 3.7
  - F5-AC-6 → Task 3.7
  - F5-AC-7 → Task 3.6, 4.1
  - F5-AC-8 → Task 3.6
  - F5-AC-9 → Task 3.6
  - F6-AC-1 → Task 3.8
  - F6-AC-2 → Task 3.8
  - F6-AC-3 → Task 3.8, 4.1
  - F6-AC-4 → Task 3.8
  - F6-AC-5 → Task 3.8
  - F6-AC-6 → Task 3.8
  - F6-AC-7 → Task 3.8
  - F6-AC-8 → Task 3.8
  - F7-AC-1 → Task 4.2
  - F7-AC-2 → Task 4.2
  - F7-AC-3 → Task 4.2
  - F7-AC-4 → Task 4.2
  - F7-AC-5 → Task 4.2
  - F7-AC-6 → Task 3.7
  - F7-AC-7 → Task 4.2
  - F7-AC-8 → Task 4.2
  - F8-AC-1 → Task 2.1, 4.3
  - F8-AC-2 → Task 4.4
  - F8-AC-3 → Task 4.3, 4.4
  - F8-AC-4 → Task 4.4
  - F8-AC-5 → Task 4.4
  - F8-AC-6 → Task 4.4
  - F8-AC-7 → Task 4.4
  - F8-AC-8 → Task 4.4
- Uncovered: 0