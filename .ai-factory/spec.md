# SPEC — JobOfferDecider

> 앱인토스 (Vite + React + TypeScript + TDS + React Router + localStorage)
> 서버 없음. 모든 계산은 클라이언트 순수 함수. 외부 API 호출 없음.

---

## Common Principles

### CP-1. 기술 스택 고정
- UI는 `@toss/tds-mobile` 컴포넌트만 사용 (ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab, Spacing, Card, Slider 대체는 아래 CP-6 참조)
- 하단 탭 네비게이션은 템플릿 제공 `src/components/FloatingTabBar` 사용 (TDS에 TabBar 없음)
- 페이지 골격은 템플릿 제공 `ScreenScaffold` 사용 — raw `<div>` 골격 금지
- 1차 액션 버튼은 `SubmitFooter`(하단 고정) 또는 `display="block"` TDS Button
- shadcn/ui, MUI, Ant Design, Chakra UI 사용 금지
- 라우팅은 `react-router-dom`의 `BrowserRouter` + `useNavigate` + `useLocation`

### CP-2. 스타일 규칙
- TDS 컴포넌트의 내장 padding/margin을 Tailwind·인라인 스타일로 덮어쓰지 않는다
- 간격은 TDS `Spacing`(size prop 필수)만 사용
- 커스텀 CSS는 flex/grid 배치에만 허용
- HEX 색상 하드코딩 금지 → `var(--tds-color-*)` CSS 변수만 사용 (다크모드 대응)

### CP-3. 모바일 규칙
- 모든 인터랙티브 요소의 터치 타겟 최소 44×44px
- 숫자 입력 필드는 `inputMode="numeric"` + `type="text"` (iOS 키보드 대응)
- 키보드 포커스 시 하단 고정 CTA가 가려지지 않도록 `SubmitFooter`는 키보드 열림 시 스크롤 컨테이너 하단에 붙는다

### CP-4. 인증
- 토스 앱이 세션을 자동 제공. 로그인 함수 호출 없음
- 사용자 식별이 필요한 경우에만 `getIsTossLoginIntegratedService()`로 연동 여부 확인. MVP에서는 미사용

### CP-5. 수익화
- 배너: `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` — 홈 화면 오퍼 목록 아래, 결과 화면 결과 카드 아래에만 배치. 콘텐츠와 겹치지 않음
- 리워드: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` — 결과 화면의 종합 분석표를 게이트
- IAP 미사용, 프로모션 리워드 미사용 (MVP 범위 외)

### CP-6. TDS 미보유 컴포넌트 대체
- 가중치 슬라이더: TDS에 Slider가 없을 경우 네이티브 `<input type="range">`를 `WeightSlider` 래퍼로 감싸되, 색상은 `var(--tds-color-*)`만 사용하고 thumb 크기 44px 확보. 라벨/값 표시는 TDS `Paragraph.Text` 사용

### CP-7. AI 미사용
- 본 앱의 판정·협상 포인트는 **규칙 기반 순수 함수**(`src/lib/verdict.ts`)로 생성된다. LLM/생성형 AI를 호출하지 않는다
- 따라서 생성형 AI 고지 의무 대상이 아니다. 대신 결과 화면에 "규칙 기반 계산 결과이며 재무·커리어 자문이 아닙니다" 고지 문구를 표시한다

### CP-8. 검수 컴플라이언스 (전 화면 공통)
- `window.location.href` / `window.open`을 통한 외부 URL 이동 금지
- 외부 분석 SDK(Google Analytics, Amplitude 등) 도입 금지
- 앱 설치 유도 문구/배너/링크 금지
- Android 7+ / iOS 16+ 미지원 API 금지 (`Array.prototype.at`, `Object.groupBy`, `structuredClone`, 옵셔널 체이닝 이상의 최신 문법은 Vite 타깃 `es2018`로 트랜스파일)
- 프로덕션 빌드에서 `console.error` 출력 0개

---

## Data Models

### Money (타입 별칭)
```ts
/** 원(KRW) 단위 정수. 소수점 없음 */
export type Won = number;
```

### CompanyProfile
현재 직장 / 제안 직장의 공통 입력 모델.

```ts
export interface CompanyProfile {
  /** UUID v4 문자열. 현재 직장은 고정값 "current" */
  id: string;
  /** 회사명. 1~20자 */
  name: string;
  /** 연봉(세전, 상여 제외). 0 ~ 500_000_000 */
  baseSalary: Won;
  /** 연간 상여/인센티브(세전). 0 ~ 500_000_000 */
  bonusPerYear: Won;
  /** 주당 재택근무 일수. 0 ~ 5 정수 */
  remoteDaysPerWeek: number;
  /** 편도 통근 시간(분). 0 ~ 180 정수 */
  commuteMinutesOneWay: number;
  /** 1일 왕복 교통비. 0 ~ 100_000 */
  commuteCostPerDay: Won;
  /** 1일 점심 식대 지출. 0 ~ 50_000 */
  lunchCostPerDay: Won;
  /** 회사 월 식대 지원금. 0 ~ 1_000_000 */
  mealSupportPerMonth: Won;
  /** 연간 복지포인트. 0 ~ 20_000_000 */
  welfarePointsPerYear: Won;
  /** 비금전 자기평가 1~5 정수 */
  ratings: NonMonetaryRatings;
  /** ISO8601. 생성/수정 시각 */
  updatedAt: string;
}

export interface NonMonetaryRatings {
  growth: 1 | 2 | 3 | 4 | 5;      // 성장성
  workLife: 1 | 2 | 3 | 4 | 5;    // 워라밸
  stability: 1 | 2 | 3 | 4 | 5;   // 안정성
  culture: 1 | 2 | 3 | 4 | 5;     // 조직문화
  commuteEase: 1 | 2 | 3 | 4 | 5; // 통근 편의
}
```

### Weights
```ts
export interface Weights {
  /** 각 0 ~ 100 정수. 합이 0이면 전부 50으로 리셋 */
  money: number;
  growth: number;
  workLife: number;
  stability: number;
  culture: number;
  commuteEase: number;
}

export const DEFAULT_WEIGHTS: Weights = {
  money: 50, growth: 50, workLife: 50,
  stability: 50, culture: 50, commuteEase: 50,
};
```

### MoneyBreakdown (계산 산출물, 저장 안 함)
```ts
export interface MoneyBreakdown {
  /** 월 출근일수 = (5 - remoteDaysPerWeek) * 4 */
  officeDaysPerMonth: number;
  /** 세전 연 총액 = baseSalary + bonusPerYear */
  grossAnnual: Won;
  /** 실효세율(0~1). TAX_TABLE 참조 */
  effectiveTaxRate: number;
  /** 월 세후 급여 = round(grossAnnual * (1 - rate) / 12) */
  netMonthlySalary: Won;
  /** 월 복지 = round(welfarePointsPerYear / 12) + mealSupportPerMonth */
  monthlyBenefit: Won;
  /** 월 통근 교통비 = commuteCostPerDay * officeDaysPerMonth */
  monthlyCommuteCost: Won;
  /** 월 점심값 = lunchCostPerDay * officeDaysPerMonth */
  monthlyLunchCost: Won;
  /** 월 통근시간 기회비용 = round(commuteMinutesOneWay*2*officeDaysPerMonth/60 * 15000) */
  monthlyCommuteTimeCost: Won;
  /** 최종 월 실질가치 */
  netMonthlyValue: Won;
}
```

### ScoreResult (계산 산출물, 저장 안 함)
```ts
export type VerdictLevel = 'MOVE' | 'CONDITIONAL' | 'HOLD' | 'STAY';

export interface ScoreItem {
  key: 'money' | 'growth' | 'workLife' | 'stability' | 'culture' | 'commuteEase';
  label: string;          // "연봉 실질가치" 등
  currentScore: number;   // 0~100 정수
  offerScore: number;     // 0~100 정수
  weightRatio: number;    // 0~1, 소수 4자리
}

export interface ScoreResult {
  offerId: string;
  items: ScoreItem[];
  currentTotal: number;   // 0~100 정수
  offerTotal: number;     // 0~100 정수
  diff: number;           // offerTotal - currentTotal
  verdict: VerdictLevel;
  verdictLabel: string;   // "이직 추천" 등
  /** 정확히 3개 */
  negotiationPoints: string[];
  currentMoney: MoneyBreakdown;
  offerMoney: MoneyBreakdown;
}
```

### AppState (localStorage 루트)
```ts
export interface AppState {
  /** 스키마 버전. 현재 1 */
  version: 1;
  current: CompanyProfile | null;
  /** 최대 3개 */
  offers: CompanyProfile[];
  weights: Weights;
  /** 리워드 광고 시청 완료된 offerId 목록 (세션 무관 영구) */
  unlockedOfferIds: string[];
}
```

### localStorage 키 & 크기
| 키 | 값 | 예상 크기 |
|---|---|---|
| `jod:state:v1` | `JSON.stringify(AppState)` | CompanyProfile 1건 ≈ 420 B → 최대 4건 ≈ 1.7 KB + weights 120 B + unlocked 120 B ≈ **2 KB** |
| `jod:onboarded:v1` | `"1"` (온보딩 안내 1회 표시 플래그) | 2 B |

총 예상 사용량 **< 5 KB** (한도 5 MB 대비 0.1%).

### 상수 테이블
```ts
/** 세전 연 총액 구간별 실효세율 (소득세+지방세+4대보험 근사) */
export const TAX_TABLE: ReadonlyArray<{ upTo: Won; rate: number }> = [
  { upTo: 24_000_000,  rate: 0.09 },
  { upTo: 36_000_000,  rate: 0.13 },
  { upTo: 50_000_000,  rate: 0.17 },
  { upTo: 70_000_000,  rate: 0.21 },
  { upTo: 100_000_000, rate: 0.26 },
  { upTo: Infinity,    rate: 0.31 },
];

/** 통근 시간 1시간의 기회비용 */
export const TIME_VALUE_PER_HOUR: Won = 15_000;

export const MAX_OFFERS = 3;
```

### 판정 규칙
| diff (= offerTotal − currentTotal) | verdict | verdictLabel |
|---|---|---|
| `diff >= 10` | `MOVE` | 이직 추천 |
| `3 <= diff <= 9` | `CONDITIONAL` | 조건부 추천 |
| `-3 <= diff <= 2` | `HOLD` | 판단 보류 |
| `diff <= -4` | `STAY` | 잔류 추천 |

---

## Feature List

### F1. 데이터 계층 & 계산 엔진

- **Description**: `AppState`의 localStorage 읽기/쓰기, 스키마 검증, 마이그레이션을 담당하는 저장소 모듈(`src/lib/storage.ts`)과 금전 실질가치·점수·판정·협상 포인트를 산출하는 순수 함수 모듈(`src/lib/calc.ts`, `src/lib/verdict.ts`)을 구현한다. UI를 포함하지 않으며 모든 함수는 부수효과 없이 입력→출력만 수행한다. 이후 모든 화면 패킷이 이 모듈에 의존한다.
- **Data**: `AppState`, `CompanyProfile`, `Weights`, `MoneyBreakdown`, `ScoreResult`
- **API**: 없음 (외부 호출 없음)
- **Requirements**: 순수 함수, 예외 대신 명시적 기본값 반환, 모든 금액은 `Math.round` 정수화

- **AC-1 [U][P0]**: Scenario: 월 실질가치 계산
  Given `CompanyProfile = { baseSalary: 60_000_000, bonusPerYear: 6_000_000, remoteDaysPerWeek: 2, commuteMinutesOneWay: 40, commuteCostPerDay: 3_000, lunchCostPerDay: 9_000, mealSupportPerMonth: 100_000, welfarePointsPerYear: 1_200_000 }`
  When `calcMoney(profile)` 호출
  Then `officeDaysPerMonth === 12` (= (5−2)×4)
  And `grossAnnual === 66_000_000`, `effectiveTaxRate === 0.21`, `netMonthlySalary === 4_345_000`
  And `monthlyBenefit === 200_000`, `monthlyCommuteCost === 36_000`, `monthlyLunchCost === 108_000`, `monthlyCommuteTimeCost === 240_000`
  And `netMonthlyValue === 4_161_000`

- **AC-2 [U][P0]**: Scenario: 가중치 정규화 및 총점 산출
  Given `Weights = { money: 100, growth: 50, workLife: 50, stability: 0, culture: 0, commuteEase: 0 }` (합 200)
  When `calcScore(current, offer, weights)` 호출
  Then `items` 배열 길이는 정확히 6이고 `weightRatio`의 합은 소수 4자리 반올림 기준 `1.0000`
  And `weightRatio`가 `0`인 항목(stability, culture, commuteEase)은 총점에 기여하지 않는다
  And `currentTotal`, `offerTotal`은 0~100 범위의 정수이다

- **AC-3 [U][P0]**: Scenario: 금전 점수 공식
  Given `currentNetMonthlyValue = 4_000_000`, `offerNetMonthlyValue = 4_400_000`
  When `moneyScore` 계산
  Then `offer.money === clamp(round(50 + (4_400_000 − 4_000_000) / 4_000_000 * 200), 0, 100) === 70`
  And `current.money === 50` (기준점 고정)

- **AC-4 [E][P0]**: Scenario: 판정 및 협상 포인트 3개 생성
  Given `currentTotal = 62`, `offerTotal = 74`
  When `getVerdict(scoreResult)` 호출
  Then `verdict === 'MOVE'`, `verdictLabel === '이직 추천'`
  And `negotiationPoints.length === 3`이고 각 문자열은 1자 이상 60자 이하이다
  And 각 포인트는 `offerScore < currentScore`인 항목을 점수 차 내림차순으로 우선 선택하며, 해당 항목이 3개 미만이면 고정 템플릿("연봉 인상 폭을 세후 기준으로 재확인하세요" 등)으로 3개를 채운다

- **AC-5 [W][P1]**: Scenario: 손상된 localStorage 데이터 복구
  Given `localStorage['jod:state:v1'] === '{broken json'`
  When `loadState()` 호출
  Then 예외를 던지지 않고 `{ version: 1, current: null, offers: [], weights: DEFAULT_WEIGHTS, unlockedOfferIds: [] }`를 반환한다
  And `console.error`를 호출하지 않는다

- **AC-6 [W][P1]**: Scenario: localStorage 용량 초과
  Given `localStorage.setItem`이 `QuotaExceededError`를 던지는 상태
  When `saveState(state)` 호출
  Then `false`를 반환하고 예외가 화면 밖으로 전파되지 않는다
  And 호출부는 Toast "저장 공간이 부족해요. 오퍼를 하나 삭제해주세요"를 표시한다

- **AC-7 [W][P1]**: Scenario: 가중치 전부 0
  Given `Weights = { money: 0, growth: 0, workLife: 0, stability: 0, culture: 0, commuteEase: 0 }`
  When `calcScore` 호출
  Then 내부적으로 `DEFAULT_WEIGHTS`(전부 50)로 대체하여 계산하며 `weightRatio`는 각각 `0.1667`이다

- **AC-8 [S][P1]**: Scenario: 현재 직장 미입력 상태
  Given `state.current === null`
  When `calcScore(null, offer, weights)` 호출
  Then `null`을 반환하고, 호출 화면은 빈 상태 UI(F2 AC-7)를 렌더한다

---

### F2. 현재 직장 / 오퍼 입력 폼

- **Description**: 현재 직장과 제안 직장의 연봉·상여·재택일수·통근시간·교통비·점심값·식대지원·복지포인트 8개 금전 항목과 비금전 5개 항목(1~5 Chip 선택)을 입력하는 폼 화면을 제공한다. 현재 직장(`/company/current`)과 오퍼(`/company/offer/:id`)가 동일 컴포넌트를 재사용하며 라우트 파라미터로 모드를 결정한다. 저장 시 유효성 검증 후 localStorage에 반영한다.
- **Data**: `CompanyProfile`, `AppState.current`, `AppState.offers`
- **API**: 없음
- **Requirements**: TDS TextField(`inputMode="numeric"`), TDS Chip(1~5 평가), TDS Button(`display="block"`), SubmitFooter

- **AC-1 [E][P0]**: Scenario: 현재 직장 저장 성공
  Given 사용자가 `/company/current`에 진입했을 때
  When 폼에 `{ name: "현재회사", baseSalary: 60000000, bonusPerYear: 6000000, remoteDaysPerWeek: 2, commuteMinutesOneWay: 40, commuteCostPerDay: 3000, lunchCostPerDay: 9000, mealSupportPerMonth: 100000, welfarePointsPerYear: 1200000, ratings: { growth: 3, workLife: 4, stability: 4, culture: 3, commuteEase: 2 } }` 입력 후 "저장" 탭
  Then `localStorage['jod:state:v1'].current.id === "current"`로 저장되고 Toast "현재 직장 정보를 저장했어요" 표시
  And `navigate('/')`로 홈 이동

- **AC-2 [E][P0]**: Scenario: 오퍼 저장 성공
  Given `state.offers.length === 0`이고 사용자가 `/company/offer/new`에 진입했을 때
  When 유효한 값 입력 후 "저장" 탭
  Then `state.offers`에 `id`가 UUID v4 형식인 항목이 1개 추가되고 Toast "오퍼를 저장했어요" 표시
  And `navigate('/')`로 홈 이동

- **AC-3 [W][P1]**: Scenario: 회사명 미입력 거부
  Given 폼이 열려 있을 때
  When `{ name: "", baseSalary: 60000000 }` 상태로 "저장" 탭
  Then 저장되지 않고 회사명 TextField 하단에 에러 텍스트 "회사명을 입력해주세요" 표시
  And 회사명 TextField에 포커스가 이동한다

- **AC-4 [W][P1]**: Scenario: 연봉 0 또는 범위 초과 거부
  Given 폼이 열려 있을 때
  When `baseSalary: 0`으로 "저장" 탭
  Then 에러 텍스트 "연봉은 1원 이상 5억원 이하로 입력해주세요" 표시
  And `baseSalary: 500000001` 입력 시에도 동일한 에러 텍스트가 표시된다

- **AC-5 [W][P1]**: Scenario: 숫자 필드 비숫자 입력 차단
  Given 연봉 TextField에 포커스된 상태에서
  When `"6천만원"` 문자열을 붙여넣기
  Then 숫자 외 문자는 즉시 제거되어 필드 값이 `"6"`이 되고, 표시 값은 천 단위 콤마 포맷(`6`)으로 렌더된다

- **AC-6 [W][P1]**: Scenario: 오퍼 4개째 추가 차단
  Given `state.offers.length === 3`일 때
  When 홈에서 "오퍼 추가" 탭
  Then `/company/offer/new`로 이동하지 않고 TDS AlertDialog "오퍼는 최대 3개까지 비교할 수 있어요"가 표시되며 확인 버튼만 존재한다

- **AC-7 [S][P1]**: Scenario: 신규 입력 폼 초기 상태
  Given `/company/offer/new` 진입 시
  Then 모든 숫자 필드는 빈 문자열(placeholder 표시: 연봉 "예) 60000000")이고 `ratings` 5개 항목은 각각 `3`이 선택된 Chip 상태이며 "저장" 버튼은 disabled이다
  And 회사명과 연봉이 모두 입력되면 "저장" 버튼이 enabled로 전환된다

- **AC-8 [U][P1]**: Scenario: 모바일 키보드 대응
  Given 폼 화면에서 임의의 숫자 TextField를 탭했을 때
  Then 해당 필드는 `inputMode="numeric"`으로 숫자 키패드를 띄우고, SubmitFooter의 "저장" 버튼이 키보드에 가려지지 않도록 스크롤 컨테이너 하단 padding이 키보드 높이만큼 확보된다
  And 모든 Chip과 Button의 렌더 높이는 44px 이상이다

---

### F3. 가중치 설정

- **Description**: 금전 1개 + 비금전 5개, 총 6개 항목의 중요도를 0~100 슬라이더로 설정하는 화면(`/weights`)을 제공한다. 슬라이더 조작 시 각 항목의 정규화 비율(%)이 실시간으로 표시되어 상대적 중요도를 즉시 확인할 수 있다. 값은 조작 종료 시 localStorage에 저장된다.
- **Data**: `AppState.weights`
- **API**: 없음
- **Requirements**: `WeightSlider` 래퍼(CP-6), TDS Paragraph.Text, TDS Button, ScreenScaffold

- **AC-1 [E][P0]**: Scenario: 가중치 저장
  Given `/weights` 화면에서
  When `money` 슬라이더를 `100`으로, `growth`를 `80`으로 조작하고 "저장" 탭
  Then `localStorage['jod:state:v1'].weights.money === 100`, `.growth === 80`으로 저장되고 Toast "중요도를 저장했어요" 표시
  And `navigate(-1)`로 이전 화면 복귀

- **AC-2 [U][P0]**: Scenario: 실시간 비율 표시
  Given `weights = { money: 100, growth: 50, workLife: 50, stability: 0, culture: 0, commuteEase: 0 }` (합 200)
  Then `money` 항목 우측에 `"50%"`, `growth`와 `workLife`에 각각 `"25%"`, 나머지 3개에 `"0%"`가 표시된다

- **AC-3 [E][P1]**: Scenario: 기본값 초기화
  Given 사용자가 임의 값으로 슬라이더를 변경한 상태에서
  When Top 우측 "초기화" 탭
  Then 6개 슬라이더가 모두 `50`으로 되돌아가고 각 항목 비율이 `"17%"`(반올림)로 표시된다

- **AC-4 [W][P1]**: Scenario: 모든 가중치 0 경고
  Given 6개 슬라이더를 모두 `0`으로 설정했을 때
  When "저장" 탭
  Then 저장되지 않고 AlertDialog "중요도를 하나 이상 0보다 크게 설정해주세요"가 표시된다

- **AC-5 [W][P1]**: Scenario: 저장 실패 처리
  Given `saveState`가 `false`를 반환하는 상태에서
  When "저장" 탭
  Then Toast "저장 공간이 부족해요. 오퍼를 하나 삭제해주세요" 표시되고 화면 이동은 발생하지 않는다

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  Given `/weights` 진입 직후 localStorage 읽기 완료 전
  Then 6개 항목 자리에 TDS Skeleton 6줄이 렌더되고 "저장" 버튼은 disabled이다
  And 읽기 완료 후 200ms 이내에 실제 슬라이더로 교체된다

- **AC-7 [U][P1]**: Scenario: 터치 타겟
  Then 각 슬라이더 thumb의 히트 영역은 44×44px 이상이고, 슬라이더 행 간격은 TDS `Spacing size={16}`으로 구분된다

- **AC-8 [U][P2]**: Scenario: 슬라이더 스타일
  Then 슬라이더 트랙/thumb 색상은 `var(--tds-color-blue-500)`, `var(--tds-color-grey-200)` CSS 변수만 사용하며 HEX 리터럴을 포함하지 않는다

---

### F4. 홈 — 오퍼 목록 & 진입점

- **Description**: 현재 직장 카드, 등록된 오퍼 목록(최대 3개), 가중치 설정 진입, 비교 화면 진입을 제공하는 앱의 루트 화면(`/`)이다. 각 오퍼 행에는 월 실질가치 차액이 미리보기로 표시되어 상세 결과 진입 동기를 만든다. 오퍼 항목은 스와이프 없이 ListRow 우측 "삭제" 액션으로 제거한다.
- **Data**: `AppState` 전체, `MoneyBreakdown`
- **API**: 없음
- **Requirements**: TDS Top, TDS ListRow, TDS Button, TDS Card, TDS AlertDialog, AdSlot, FloatingTabBar

- **AC-1 [U][P0]**: Scenario: 오퍼 목록 렌더
  Given `state.current !== null`이고 `state.offers.length === 2`일 때
  Then `data-testid="offer-list"` 안에 TDS ListRow 2개가 렌더되고, 각 행의 우측 contents에 `netMonthlyValue` 차액이 `"+41만원/월"` 또는 `"-12만원/월"` 형식(만원 단위 반올림, 부호 포함)으로 표시된다
  And 차액이 0 이상이면 `var(--tds-color-blue-500)`, 음수면 `var(--tds-color-red-500)` 텍스트 색상을 사용한다

- **AC-2 [E][P0]**: Scenario: 결과 화면 진입
  Given 홈에 오퍼 "A사"(id: `"o-1"`)가 있을 때
  When 해당 ListRow 탭
  Then `navigate('/result/o-1')`가 호출된다

- **AC-3 [E][P0]**: Scenario: 오퍼 삭제
  Given `state.offers.length === 2`일 때
  When 첫 번째 행의 "삭제" 버튼 탭 → AlertDialog "'A사' 오퍼를 삭제할까요?"에서 "삭제" 탭
  Then `state.offers.length === 1`이 되고 `state.unlockedOfferIds`에서 해당 id가 제거되며 Toast "삭제했어요" 표시

- **AC-4 [S][P1]**: Scenario: 현재 직장 미입력 빈 상태
  Given `state.current === null`일 때
  Then `data-testid="empty-current"` 영역에 TDS `Asset.ContentIcon`과 문구 "먼저 현재 직장 정보를 입력해주세요"가 표시되고, `display="block"` TDS Button "현재 직장 입력하기"만 노출된다
  And 오퍼 목록 영역과 "비교하기" 버튼은 렌더되지 않는다

- **AC-5 [S][P1]**: Scenario: 오퍼 0개 빈 상태
  Given `state.current !== null`이고 `state.offers.length === 0`일 때
  Then `data-testid="empty-offers"` 영역에 `Asset.ContentIcon`과 "비교할 오퍼를 추가해보세요"가 표시되고 "오퍼 추가" 버튼이 `display="block"`으로 노출된다

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  Given `/` 진입 직후 상태 로드 전
  Then TDS Skeleton 카드 1개 + 행 2개가 렌더되고, 로드 완료 시 실제 콘텐츠로 교체된다

- **AC-7 [U][P1]**: Scenario: 배너 광고 배치
  Then `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`는 오퍼 목록 섹션 **아래**, FloatingTabBar **위**에 배치되며 어떤 ListRow와도 겹치지 않는다
  And 광고 로드 실패 시 해당 영역 높이는 0이 되고 에러 문구를 표시하지 않는다

- **AC-8 [U][P1]**: Scenario: 레이아웃 계약
  Then 화면은 `ScreenScaffold`로 감싸이고, 현재 직장 요약은 `data-testid="current-card"` TDS Card 1개로 묶이며 카드 내부에 월 실질가치가 `t2` 타이포로 강조 표기된다
  And 모든 ListRow와 Button의 높이는 44px 이상이다

---

### F5. 리워드 광고 게이트 & 결과 분석 화면

- **Description**: 선택한 오퍼 1건에 대해 현재 직장 대비 종합 점수 비교표, 이직 판정, 협상 포인트 3가지를 보여주는 핵심 가치 화면(`/result/:offerId`)이다. 월 실수령 차액 요약(SummaryHero)은 광고 없이 공개하고, 상세 분석표·판정·협상 포인트는 `TossRewardAd`로 게이트한다. 한 번 시청한 오퍼는 `unlockedOfferIds`에 기록되어 재시청 없이 열람된다.
- **Data**: `ScoreResult`, `MoneyBreakdown`, `AppState.unlockedOfferIds`
- **API**: 없음
- **Requirements**: TDS Top, TDS Card, TDS Chip, TDS Paragraph.Text, TossRewardAd, AdSlot, SummaryHero(CountUp), MiniBar

- **AC-1 [E][P0]**: Scenario: 결과 보기 전 보상형 광고
  Given 사용자가 `/result/o-1`에서 `unlockedOfferIds`에 `"o-1"`이 없는 상태
  When "분석 결과 보기" 버튼을 탭하고 `TossRewardAd` 광고 시청을 완료
  Then `data-testid="score-table"` 상세 분석표, `data-testid="verdict-card"` 판정 카드, `data-testid="negotiation-card"` 협상 포인트 카드가 표시된다
  And `state.unlockedOfferIds`에 `"o-1"`이 추가되어 localStorage에 저장된다

- **AC-2 [S][P0]**: Scenario: 이미 해금된 오퍼 재진입
  Given `state.unlockedOfferIds`에 `"o-1"`이 포함된 상태
  When `/result/o-1` 진입
  Then 광고 게이트 없이 즉시 상세 분석표·판정·협상 포인트가 표시되고 "분석 결과 보기" 버튼은 렌더되지 않는다

- **AC-3 [U][P0]**: Scenario: 점수 비교표 렌더
  Given `ScoreResult.items.length === 6`이고 `currentTotal = 62`, `offerTotal = 74`
  Then `data-testid="score-table"` 내부에 6개 행이 렌더되고 각 행은 `label`, 현재 점수, 오퍼 점수, `MiniBar`(오퍼 점수 비율)를 포함한다
  And 합계 행에 `"62점"`과 `"74점"`이 표시되고 판정 Chip에 `"이직 추천"` 텍스트가 표시된다

- **AC-4 [U][P0]**: Scenario: 레이아웃 계약
  Then 화면은 `ScreenScaffold`로 감싸이고, `data-testid="strategy-card"` TDS Card가 정확히 2개(현재 직장 카드, 제안 직장 카드) 나란히 렌더된다
  And 각 카드 안의 월 실질가치는 `t2` 타이포로 강조되고, 차액은 `data-testid="net-diff-hero"` SummaryHero에 CountUp으로 `"+410,000원"` 형식(부호+천단위 콤마+"원")으로 표시된다

- **AC-5 [U][P0]**: Scenario: 협상 포인트 3개
  Then `data-testid="negotiation-card"` 안에 정확히 3개의 ListRow가 렌더되고 각 행은 번호(1,2,3)와 포인트 문구를 포함한다

- **AC-6 [W][P1]**: Scenario: 광고 로드/시청 실패
  Given `/result/o-1`에서 "분석 결과 보기" 탭 후 광고 로드가 실패하거나 사용자가 중도 종료한 경우
  Then 상세 분석표는 표시되지 않고 Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요" 표시
  And `unlockedOfferIds`는 변경되지 않으며 "분석 결과 보기" 버튼은 다시 tappable 상태로 복귀한다

- **AC-7 [W][P1]**: Scenario: 잘못된 offerId 접근
  Given `state.offers`에 id `"o-99"`가 없을 때
  When `/result/o-99` 직접 진입
  Then `data-testid="not-found"` 영역에 "오퍼를 찾을 수 없어요"와 `display="block"` Button "홈으로"가 표시되고, 탭 시 `navigate('/', { replace: true })`가 호출된다

- **AC-8 [S][P1]**: Scenario: 계산 중 로딩 상태
  Given `/result/o-1` 진입 후 `calcScore` 실행 전
  Then SummaryHero 자리에 TDS Skeleton 1개, 카드 2개 자리에 Skeleton 2개가 렌더되고, 계산 완료 시 실제 값으로 교체된다

- **AC-9 [U][P1]**: Scenario: 고지 문구 및 배너
  Then 결과 카드 하단에 `Paragraph.Text`로 "규칙 기반 계산 결과이며 재무·커리어 자문이 아닙니다. 세금은 구간별 근사치입니다"가 표시된다
  And `<AdSlot />` 배너는 이 고지 문구 **아래**에 배치되어 결과 카드와 겹치지 않는다

---

### F6. 복수 오퍼 비교표

- **Description**: 현재 직장 포함 최대 4열(현재 + 오퍼 3)을 한 화면에서 항목별로 비교하는 화면(`/compare`)이다. 각 행은 월 실질가치·종합 점수·6개 세부 점수이며, 행마다 최고값 셀에 강조 배지를 표시한다. 열이 3개를 초과하지 않으므로 가로 스크롤 없이 고정 그리드로 렌더한다.
- **Data**: `AppState`, `ScoreResult[]`
- **API**: 없음
- **Requirements**: TDS Card, TDS Chip, TDS Paragraph.Text, ScreenScaffold, CSS grid

- **AC-1 [U][P0]**: Scenario: 비교 그리드 렌더
  Given `state.current !== null`이고 `state.offers.length === 3`일 때
  Then `data-testid="compare-grid"`는 4개 열(현재, 오퍼1~3)과 8개 행(월 실질가치, 종합 점수, 6개 세부 점수)을 렌더한다
  And 각 행에서 최댓값을 가진 셀에 TDS Chip `"최고"` 배지가 정확히 1개 표시된다(동점 시 왼쪽 열 1개만)

- **AC-2 [U][P0]**: Scenario: 종합 점수 하이라이트
  Given 종합 점수가 `현재 62 / A사 74 / B사 68 / C사 59`일 때
  Then 종합 점수 행의 A사 셀 값은 `t3` 타이포로 강조되고 `data-testid="compare-best-total"` 속성을 가진다

- **AC-3 [E][P0]**: Scenario: 열 탭 시 결과 화면 이동
  Given 비교 화면에서 오퍼 "A사"(id `"o-1"`) 열 헤더를 탭
  Then `navigate('/result/o-1')`가 호출된다

- **AC-4 [S][P1]**: Scenario: 오퍼 1개 이하 빈 상태
  Given `state.offers.length <= 1`일 때
  Then `data-testid="empty-compare"`에 `Asset.ContentIcon`과 "오퍼를 2개 이상 등록하면 비교할 수 있어요"가 표시되고 "오퍼 추가" Button이 `display="block"`으로 노출되며 비교 그리드는 렌더되지 않는다

- **AC-5 [S][P1]**: Scenario: 미해금 오퍼 마스킹
  Given `state.unlockedOfferIds`에 `"o-2"`가 없을 때
  Then `"o-2"` 열의 6개 세부 점수 셀은 `"?"`로 마스킹되고 월 실질가치와 종합 점수만 표시된다
  And 해당 열 하단에 `"결과 보기"` Button이 표시되며 탭 시 `navigate('/result/o-2')`로 이동한다

- **AC-6 [W][P1]**: Scenario: 현재 직장 미입력
  Given `state.current === null`일 때
  When `/compare` 직접 진입
  Then 그리드 대신 "먼저 현재 직장 정보를 입력해주세요" 문구와 Button "현재 직장 입력하기"가 표시되고, 탭 시 `navigate('/company/current')`가 호출된다

- **AC-7 [S][P1]**: Scenario: 로딩 상태
  Given `/compare` 진입 후 계산 완료 전
  Then 그리드 자리에 4열×8행 Skeleton 그리드가 렌더된다

- **AC-8 [U][P1]**: Scenario: 터치 타겟 및 세로 스크롤
  Then 열 헤더와 "결과 보기" Button의 높이는 44px 이상이며, 그리드는 가로 스크롤 없이 세로 스크롤만 허용한다(열 너비 = `calc(100% / 열개수)`)

---

### F7. 결과 이미지 저장

- **Description**: 결과 화면(`/result/:offerId`)의 분석 카드 영역을 PNG 이미지로 렌더해 사용자 기기에 저장하는 기능이다. `html-to-image`의 `toPng`로 DOM을 캔버스화한 뒤 Blob URL + `<a download>`로 다운로드를 트리거하며, 외부 도메인 이동은 발생하지 않는다. 저장 실패 시 스크린샷 안내로 폴백한다.
- **Data**: 없음(렌더된 DOM만 사용)
- **API**: 없음
- **Requirements**: TDS Button, TDS Toast, TDS BottomSheet, `html-to-image`

- **AC-1 [E][P0]**: Scenario: 이미지 저장 성공
  Given `/result/o-1`에서 오퍼가 해금된 상태
  When "이미지로 저장" 버튼 탭
  Then `data-testid="capture-area"` 요소가 `toPng`로 변환되어 파일명 `joboffer-{offerName}-{yyyyMMdd}.png` 형식으로 다운로드가 트리거되고 Toast "이미지를 저장했어요" 표시

- **AC-2 [S][P0]**: Scenario: 미해금 상태 버튼 숨김
  Given `unlockedOfferIds`에 `"o-1"`이 없을 때
  Then "이미지로 저장" 버튼은 렌더되지 않는다

- **AC-3 [S][P1]**: Scenario: 변환 중 로딩
  Given "이미지로 저장" 탭 직후 변환이 진행 중일 때
  Then 버튼은 disabled + TDS 로딩 인디케이터 상태가 되고 라벨이 "저장 중..."으로 바뀐다
  And 변환 완료 또는 실패 시 원래 라벨 "이미지로 저장"으로 복귀한다

- **AC-4 [W][P1]**: Scenario: 변환 실패 폴백
  Given `toPng`가 rejected Promise를 반환하는 상태
  When "이미지로 저장" 탭
  Then Toast "이미지 저장에 실패했어요. 스크린샷으로 저장해주세요" 표시
  And `console.error`를 호출하지 않고 화면은 이동하지 않는다

- **AC-5 [W][P1]**: Scenario: 다운로드 미지원 환경
  Given `HTMLAnchorElement.prototype`에 `download` 속성이 없는 환경일 때
  When "이미지로 저장" 탭
  Then `window.open`을 호출하지 않고 Toast "이 환경에서는 저장할 수 없어요. 스크린샷으로 저장해주세요"를 표시한다

- **AC-6 [U][P1]**: Scenario: 캡처 영역 정의
  Then `data-testid="capture-area"`는 판정 카드 + 점수 비교표 + 협상 포인트 카드를 포함하고, `<AdSlot />` 배너와 하단 고지 문구는 포함하지 않는다

- **AC-7 [U][P1]**: Scenario: Blob 메모리 해제
  Then 다운로드 트리거 후 `URL.revokeObjectURL`이 호출되어 Blob URL이 해제된다

- **AC-8 [U][P2]**: Scenario: 이미지 배경
  Then 생성 이미지의 배경색은 `getComputedStyle(document.body).backgroundColor`에서 읽어 적용하며 HEX 리터럴을 코드에 하드코딩하지 않는다(다크모드에서도 텍스트 대비 유지)

---

### F8. 온보딩 안내 & 검수 컴플라이언스

- **Description**: 최초 실행 시 앱의 계산 방식과 한계를 1회 안내하는 다이얼로그를 표시하고, 앱 전역에 적용되는 토스 검수 규칙(외부 이탈 차단, 콘솔 에러 0, 색상 변수화, 호환성)을 보장한다. 안내 확인 여부는 localStorage 플래그로 기록한다.
- **Data**: `localStorage['jod:onboarded:v1']`
- **API**: 없음
- **Requirements**: TDS AlertDialog, ErrorBoundary

- **AC-1 [E][P0]**: Scenario: 최초 실행 안내 1회
  Given `localStorage['jod:onboarded:v1']`가 없을 때
  When 앱이 `/`에 진입
  Then AlertDialog "이 앱의 판정은 입력값에 대한 규칙 기반 계산 결과이며, 세금은 구간별 근사치입니다"가 1회 표시된다
  And "확인" 탭 시 `localStorage['jod:onboarded:v1'] === "1"`로 저장되고, 이후 재진입 시 다이얼로그는 표시되지 않는다

- **AC-2 [W][P0]**: Scenario: 외부 도메인 이탈 금지
  Given 앱 전체 소스에서
  Then `window.location.href = `, `window.open(`, `<a href="http`, `target="_blank"` 패턴이 0건이다
  And 사용자가 외부 URL로 이동할 수 있는 UI 요소가 존재하지 않는다

- **AC-3 [U][P0]**: Scenario: 콘솔 에러 0개
  Given `vite build` 프로덕션 번들을 실행하고 홈 → 입력 → 가중치 → 결과 → 비교 전 화면을 순회했을 때
  Then `console.error` 호출 횟수는 0이다
  And 최상위 ErrorBoundary가 렌더 예외를 포착해 "일시적인 오류가 발생했어요" 화면과 "홈으로" Button을 표시한다

- **AC-4 [U][P0]**: Scenario: CORS 에러 0개
  Given 앱 실행 전 구간에서
  Then 외부 도메인으로의 `fetch`/`XMLHttpRequest` 호출이 0건이므로 CORS 에러가 발생하지 않는다

- **AC-5 [W][P0]**: Scenario: HEX 색상 하드코딩 금지
  Given `src/**/*.{ts,tsx,css}` 전체를 `/#[0-9a-fA-F]{3,8}\b/` 정규식으로 검색했을 때
  Then 매칭 결과가 0건이다 (모든 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값 사용)

- **AC-6 [U][P0]**: Scenario: Android 7+ / iOS 16+ 호환
  Given `vite.config.ts`의 `build.target === 'es2018'`일 때
  Then 번들 산출물에 `structuredClone(`, `.at(`, `Object.groupBy`, `Array.prototype.findLast` 문자열이 0건이다

- **AC-7 [W][P0]**: Scenario: 앱 설치 유도 및 외부 로깅 금지
  Then 앱 내 텍스트에 "설치", "다운로드", "앱스토어", "플레이스토어" 문자열이 0건이다
  And `package.json` dependencies에 `analytics`, `amplitude`, `gtag`, `mixpanel`을 포함하는 패키지가 0건이다

- **AC-8 [U][P1]**: Scenario: 프로모션 리워드 한도 (미사용 확인)
  Then 소스 전체에서 `grantPromotionReward` 호출이 0건이다. (추후 도입 시 `amount <= 5000` 검증을 호출 직전에 수행하고 초과 시 호출하지 않는다)

---

## Screen Definitions

### S1. 홈 (`/`)
- **TDS 컴포넌트**: TDS Top(title="이직 결정하기"), TDS Card(현재 직장 요약), TDS ListRow(오퍼 행), TDS Button(`display="block"` — "오퍼 추가", "비교하기"), TDS AlertDialog(삭제 확인, 최대 3개 경고), TDS Chip(판정 배지), TDS Spacing, `Asset.ContentIcon`(빈 상태), Skeleton
- **템플릿 컴포넌트**: `ScreenScaffold`, `FloatingTabBar`, `AdSlot`, `SummaryHero`
- **Layout/Presentation 계약**:
  - `ScreenScaffold`로 감싼다 (raw div 골격 금지)
  - 현재 직장 요약은 `data-testid="current-card"` TDS Card 1개, 내부 월 실질가치는 `t2` 타이포
  - 오퍼 목록은 `data-testid="offer-list"` 안의 ListRow 나열, 각 행 우측에 차액 `MiniBar` + 부호 텍스트
  - 1차 액션 "오퍼 추가"는 `display="block"` TDS Button (좌측 글자폭 금지)
  - `<AdSlot />`은 오퍼 목록 아래, FloatingTabBar 위
- **상태**: 로딩=Skeleton 카드1+행2 / 빈(현재직장 없음)=`data-testid="empty-current"` / 빈(오퍼 0)=`data-testid="empty-offers"` / 에러=ErrorBoundary 폴백
- **터치**: 모든 ListRow·Button 높이 ≥ 44px, 삭제 버튼 히트영역 44×44px
- **스크롤**: 세로 스크롤. 최대 4행이므로 가상 스크롤 불필요
- **Navigation state 계약**:
  - Incoming: `location.state` 미사용 (`undefined`)
  - Outgoing: 현재 직장 카드 탭 → `navigate('/company/current')` (state 없음)
  - Outgoing: 오퍼 행 탭 → `navigate('/result/' + offer.id)` (state 없음, offerId는 URL param)
  - Outgoing: "오퍼 추가" → `navigate('/company/offer/new')` (state 없음)
  - Outgoing: "비교하기" → `navigate('/compare')` (state 없음)
  - Outgoing: FloatingTabBar "중요도" → `navigate('/weights')` (state 없음)

### S2. 회사 정보 입력 (`/company/current`, `/company/offer/new`, `/company/offer/:id`)
- **TDS 컴포넌트**: TDS Top(title=모드별 "현재 직장" / "오퍼 정보", 좌측 back), TDS TextField(회사명 1개 + 숫자 7개, `inputMode="numeric"`), TDS Chip(비금전 5항목 × 1~5), TDS Paragraph.Text(섹션 라벨), TDS Spacing, TDS Toast, TDS AlertDialog
- **템플릿 컴포넌트**: `ScreenScaffold`, `SubmitFooter`
- **Layout/Presentation 계약**:
  - `ScreenScaffold` + `SubmitFooter`(하단 고정 "저장" 버튼)
  - 섹션 3개: "기본 정보"(회사명·연봉·상여), "근무 조건"(재택일수·통근시간·교통비·점심값·식대지원·복지포인트), "만족도"(Chip 5행)
  - 섹션 간 구분은 `Spacing size={24}` (TextField에 padding 오버라이드 금지)
  - `data-testid="company-form"`
- **상태**: 로딩=Skeleton 8줄 / 초기(new)=빈 필드 + 저장 disabled / 에러=필드별 하단 에러 텍스트 / 저장 실패=Toast
- **터치**: TextField 높이 ≥ 48px, Chip ≥ 44×44px, SubmitFooter 버튼 높이 56px
- **키보드**: `inputMode="numeric"`, 포커스 시 해당 필드가 키보드 위로 `scrollIntoView({ block: 'center' })`, 스크롤 컨테이너에 `padding-bottom: env(safe-area-inset-bottom) + 88px`
- **Navigation state 계약**:
  - Incoming: `location.state` 미사용. 편집 대상은 URL param `:id`로만 결정 (`"new"`이면 신규 모드, `/company/current`이면 현재 직장 모드)
  - Outgoing: 저장 성공 → `navigate('/', { replace: true })` (state 없음)
  - Outgoing: back → `navigate(-1)`

### S3. 중요도 설정 (`/weights`)
- **TDS 컴포넌트**: TDS Top(title="중요도 설정", 우측 텍스트버튼 "초기화"), TDS Paragraph.Text(항목 라벨 + 비율 %), TDS AlertDialog, TDS Toast, TDS Spacing, Skeleton
- **템플릿/커스텀**: `ScreenScaffold`, `SubmitFooter`, `WeightSlider`(CP-6)
- **Layout/Presentation 계약**:
  - `ScreenScaffold` + `SubmitFooter`("저장", `display="block"`)
  - 6개 슬라이더 행은 `data-testid="weight-list"` 내 flex column, 행 간 `Spacing size={16}`
  - 각 행 = 라벨(좌) + 비율%(우, `t5` 강조) + 슬라이더(하단 full-width)
- **상태**: 로딩=Skeleton 6줄 / 빈 상태 없음(항상 기본값 존재) / 에러=AlertDialog(전부 0) + Toast(저장 실패)
- **터치**: 슬라이더 thumb 히트영역 44×44px, "초기화" 텍스트 버튼 히트영역 44×44px
- **Navigation state 계약**:
  - Incoming: `location.state` 미사용
  - Outgoing: 저장 성공 → `navigate(-1)`

### S4. 결과 분석 (`/result/:offerId`)
- **TDS 컴포넌트**: TDS Top(title=오퍼명, 좌측 back), TDS Card(현재/오퍼 2장 + 판정 카드 + 협상 카드), TDS Chip(판정 배지, "AI 미사용" 아님 — "규칙 기반" 배지), TDS Paragraph.Text(고지 문구), TDS ListRow(협상 포인트 3행), TDS Button(`display="block"` — "분석 결과 보기", "이미지로 저장"), TDS Toast, Skeleton
- **템플릿 컴포넌트**: `ScreenScaffold`, `TossRewardAd`, `AdSlot`, `SummaryHero`(CountUp), `MiniBar`
- **Layout/Presentation 계약**:
  - `ScreenScaffold`로 감싼다
  - 상단 `data-testid="net-diff-hero"` `SummaryHero` — 월 실수령 차액을 CountUp으로 표시 (광고 전에도 공개)
  - `data-testid="strategy-card"` TDS Card **정확히 2개** (현재 직장 / 제안 직장) 좌우 배치, 각 카드 내 월 실질가치 `t2` 강조 + 세부 5줄(세후급여/복지/교통비/점심/시간비용)
  - 게이트 영역: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 안에 `data-testid="score-table"`(6행 + MiniBar), `data-testid="verdict-card"`(판정 Chip + diff), `data-testid="negotiation-card"`(ListRow 3개)
  - `data-testid="capture-area"`는 verdict-card + score-table + negotiation-card를 감싸며 AdSlot·고지문구 제외
  - 하단 순서: 고지 문구 → `<AdSlot />` (결과 카드와 겹치지 않음)
- **상태**: 로딩=Skeleton(hero 1 + card 2) / 미해금=게이트 CTA 노출 / 빈=`data-testid="not-found"`(잘못된 offerId) / 에러=Toast(광고 실패, 이미지 저장 실패)
- **터치**: "분석 결과 보기"·"이미지로 저장" 버튼 높이 56px, back 버튼 44×44px
- **스크롤**: 세로 스크롤. 항목 수 고정(≤ 20행)이므로 가상 스크롤 불필요
- **Navigation state 계약**:
  - Incoming: `useParams<{ offerId: string }>()`. `location.state`는 사용하지 않으며 `undefined`여도 정상 동작해야 한다(딥링크·새로고침 대응)
  - Outgoing: back → `navigate(-1)`
  - Outgoing: not-found "홈으로" → `navigate('/', { replace: true })`
  - Outgoing: "정보 수정" → `navigate('/company/offer/' + offerId)` (state 없음)

### S5. 오퍼 비교 (`/compare`)
- **TDS 컴포넌트**: TDS Top(title="한눈에 비교"), TDS Card(그리드 컨테이너), TDS Chip("최고" 배지), TDS Paragraph.Text(셀 값), TDS Button(`display="block"` — "오퍼 추가"/"결과 보기"), `Asset.ContentIcon`, Skeleton
- **템플릿 컴포넌트**: `ScreenScaffold`, `FloatingTabBar`, `MiniBar`
- **Layout/Presentation 계약**:
  - `ScreenScaffold`로 감싼다
  - `data-testid="compare-grid"` — CSS grid, `grid-template-columns: repeat(var(--cols), 1fr)`, 최대 4열
  - 행 라벨 열 고정 없이 첫 행이 회사명 헤더, 종합 점수 행의 최고값 셀은 `t3` 강조 + `data-testid="compare-best-total"`
  - 월 실질가치 행에는 `MiniBar`로 상대 비율 시각화
- **상태**: 로딩=4×8 Skeleton 그리드 / 빈=`data-testid="empty-compare"`(오퍼 ≤ 1) / 현재직장 없음=안내 + CTA / 미해금 열=세부 점수 `"?"` 마스킹
- **터치**: 열 헤더 히트영역 ≥ 44px 높이, "결과 보기" 버튼 높이 44px 이상
- **스크롤**: 세로 스크롤만. 가로 스크롤 금지(열 너비 = `100% / 열개수`)
- **Navigation state 계약**:
  - Incoming: `location.state` 미사용
  - Outgoing: 열 헤더 탭 / "결과 보기" 탭 → `navigate('/result/' + offerId)` (state 없음)
  - Outgoing: "오퍼 추가" → `navigate('/company/offer/new')`
  - Outgoing: "현재 직장 입력하기" → `navigate('/company/current')`

### 라우트 요약
| Path | Screen | Params | location.state |
|---|---|---|---|
| `/` | 홈 | — | 없음 |
| `/company/current` | 현재 직장 입력 | — | 없음 |
| `/company/offer/new` | 오퍼 신규 입력 | — | 없음 |
| `/company/offer/:id` | 오퍼 편집 | `id: string` | 없음 |
| `/weights` | 중요도 설정 | — | 없음 |
| `/result/:offerId` | 결과 분석 | `offerId: string` | 없음 |
| `/compare` | 오퍼 비교 | — | 없음 |
| `*` | 홈으로 `<Navigate to="/" replace />` | — | 없음 |

> **설계 원칙**: 모든 화면 간 데이터 전달은 URL param + localStorage로만 수행하고 `location.state`를 일절 사용하지 않는다. 이로써 패킷 간 state 타입 불일치 버그와 새로고침 시 state 소실 버그가 원천 차단된다.

---

## Data Storage

### 키 1: `jod:state:v1`
```ts
// 값 = JSON.stringify(AppState)
{
  "version": 1,
  "current": {
    "id": "current",
    "name": "현재회사",
    "baseSalary": 60000000,
    "bonusPerYear": 6000000,
    "remoteDaysPerWeek": 2,
    "commuteMinutesOneWay": 40,
    "commuteCostPerDay": 3000,
    "lunchCostPerDay": 9000,
    "mealSupportPerMonth": 100000,
    "welfarePointsPerYear": 1200000,
    "ratings": { "growth": 3, "workLife": 4, "stability": 4, "culture": 3, "commuteEase": 2 },
    "updatedAt": "2026-08-15T09:00:00.000Z"
  },
  "offers": [ /* CompanyProfile, 최대 3개 */ ],
  "weights": { "money": 50, "growth": 50, "workLife": 50, "stability": 50, "culture": 50, "commuteEase": 50 },
  "unlockedOfferIds": ["o-1"]
}
```
- **크기 추정**: `CompanyProfile` 1건 ≈ 420 B(UTF-8, 한글 회사명 10자 가정) × 4건 = 1,680 B / `weights` ≈ 120 B / `unlockedOfferIds` ≈ 120 B / 래퍼 ≈ 60 B → **총 ≈ 1.98 KB**
- **쓰기 시점**: 회사 저장, 회사 삭제, 가중치 저장, 리워드 광고 시청 완료
- **읽기 시점**: 각 화면 마운트 시 1회

### 키 2: `jod:onboarded:v1`
- 값: `"1"` (문자열 리터럴)
- 크기: **2 B**
- 쓰기: 온보딩 AlertDialog "확인" 탭 시 1회

### 총 사용량
**≈ 2 KB** — localStorage 한도 5 MB의 0.04%. 용량 한계 도달 가능성 없음. 단, 타 미니앱과 오리진 공유 시 `QuotaExceededError` 방어 코드는 F1 AC-6으로 필수 구현.

### 마이그레이션
```ts
// version !== 1 이거나 파싱 실패 시 초기 상태로 리셋 (데이터 손실 허용 — MVP)
function migrate(raw: unknown): AppState {
  if (!isValidAppState(raw)) return INITIAL_STATE;
  return raw;
}
```

---

## API Contract

**해당 없음.** 본 앱은 외부 API를 호출하지 않는다.
- 모든 계산은 클라이언트 순수 함수(`src/lib/calc.ts`)에서 수행
- 모든 데이터는 localStorage에 저장
- 외부 서버 통신 0건 → CORS 이슈 발생 여지 없음 (F8 AC-4)
- 향후 세율 테이블 원격 갱신이 필요해지면 별도 Railway API 서버를 설계하며, 그때의 에러 응답 형태는 `{ error: string }`으로 통일한다.

---

## Assumptions

1. **세율 근사**: `TAX_TABLE`은 부양가족·공제 항목을 무시한 구간별 실효세율 근사치다. 정확한 실수령액 계산이 아니며 화면에 고지한다(F5 AC-9).
2. **월 근무일**: 주 5일, 월 4주 고정. 공휴일·연차를 반영하지 않는다.
3. **통근 시간 가치**: `TIME_VALUE_PER_HOUR = 15,000원` 고정. MVP에서 사용자 조정 불가.
4. **재택일수**: 주당 정수(0~5)로만 입력. 격주 재택 등은 반올림해 입력하도록 안내한다.
5. **비금전 평가**: 성장성·워라밸·안정성·조직문화·통근편의는 사용자 주관 평가(1~5)이며 객관 데이터를 사용하지 않는다.
6. **협상 포인트**: 규칙 기반 템플릿 문자열 조합이며 생성형 AI를 사용하지 않는다(CP-7). 따라서 AI 고지 의무 대상이 아니다.
7. **다중 기기 동기화 없음**: localStorage 기반이므로 기기 간 데이터 공유가 되지 않는다.
8. **리워드 해금 영구**: 한 번 광고를 본 오퍼는 앱 삭제 전까지 재시청 없이 열람 가능하다(사용자 경험 우선).
9. **이미지 저장**: `html-to-image` 번들 크기 약 15 KB gzip으로 성능 영향이 없다고 가정한다. 토스 웹뷰에서 `<a download>`가 동작한다고 가정하되 실패 폴백을 구현한다(F7 AC-4, AC-5).
10. **TDS Slider 부재**: TDS에 Slider 컴포넌트가 없다고 가정하고 `WeightSlider` 래퍼를 구현한다. 실제 존재할 경우 TDS 컴포넌트로 즉시 교체한다.

---

## Open Questions

| # | 질문 | 영향 범위 | 기본 결정(미응답 시) |
|---|---|---|---|
| Q1 | TDS에 Slider 컴포넌트가 존재하는가? | F3 구현 방식 | `WeightSlider` 커스텀 래퍼 사용(CP-6) |
| Q2 | 토스 웹뷰에서 `<a download>` PNG 저장이 허용되는가? | F7 전체 | 시도 후 실패 시 스크린샷 안내 Toast 폴백 |
| Q3 | 세율 테이블을 더 정밀하게(부양가족 수 입력) 만들 필요가 있는가? | F1, F2 | MVP는 구간 근사 유지 + 고지 문구 |
| Q4 | 오퍼 최대 개수를 3개로 유지할 것인가? | F2 AC-6, F6 | PRD 명시대로 3개 고정 |
| Q5 | 리워드 광고 해금을 오퍼별이 아닌 앱 전체 1회로 할 것인가? | F5 수익 모델 | 오퍼별 해금 유지(전환 횟수 극대화) |
| Q6 | 통근 시간 가치(15,000원/시)를 사용자가 조정 가능하게 할 것인가? | F1, F3 | MVP 고정값. v2에서 설정 화면 추가 검토 |
| Q7 | 향후 협상 포인트를 LLM으로 생성할 계획이 있는가? | CP-7, AI 고지 의무 | MVP는 규칙 기반. LLM 도입 시 AI 사전 고지 + 결과물 라벨 AC를 추가해야 함 |