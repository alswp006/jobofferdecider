# SPEC — JobOfferDecider

## Common Principles

1. **Platform**: 앱인토스 미니앱. Vite + React + TypeScript + React Router(react-router-dom) + TDS(@toss/tds-mobile).
2. **인증**: 토스 앱이 세션을 자동 제공. 로그인 호출 코드 없음. 사용자 식별 필요 시 `getIsTossLoginIntegratedService()`로 연동 상태만 확인.
3. **데이터**: 전부 localStorage. 서버 없음. 외부 API 호출 없음 → CORS 이슈 원천 차단.
4. **AI 미사용**: 모든 점수/판정/협상 포인트는 결정론적 규칙 기반 계산(순수 함수). 생성형 AI를 쓰지 않으므로 "AI가 생성한 결과입니다" 라벨 대신 **"규칙 기반 계산 결과입니다"** 고지를 표시한다. (AI 고지 의무 비해당 — Assumptions A5 참조)
5. **UI 규칙**: 모든 UI는 TDS 컴포넌트로 조립. 간격은 TDS `Spacing`(size 필수)만 사용. Tailwind/인라인 스타일로 TDS 내부 여백 덮어쓰기 금지. 커스텀 CSS는 flex/grid 레이아웃에만 허용.
6. **색상**: HEX 하드코딩 전면 금지. `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값만 사용(다크모드 대응).
7. **터치 타깃**: 모든 인터랙티브 요소 최소 44x44px.
8. **페이지 골격**: 모든 화면은 템플릿 제공 `ScreenScaffold`로 감싼다. raw `div` 골격 금지. 1차 액션은 `SubmitFooter`(하단 고정) 또는 `display="block"` 버튼.
9. **하단 탭**: 템플릿 제공 `src/components/FloatingTabBar` 사용(TDS에 TabBar 없음). TDS `Tab`은 화면 내 콘텐츠 전환에만 사용.
10. **광고**: 배너는 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`, 리워드 게이트는 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`. 광고는 콘텐츠와 절대 겹치지 않으며 섹션 사이/결과 하단에만 배치.
11. **금액 단위**: 입력은 "만원" 단위(연봉/상여/복지포인트), 계산·표시는 "원" 단위로 환산. 통근시간은 편도 분.
12. **외부 이동 금지**: `window.location.href` / `window.open` 으로 외부 URL 이동 없음. 외부 분석 SDK(GA, Amplitude 등) 미사용.
13. **호환성**: Android 7+, iOS 16+. `Array.at`, `Object.groupBy`, `structuredClone`, CSS `:has()` 등 최신 전용 API 미사용.
14. **에러 로깅**: 프로덕션 빌드에서 `console.error` 호출 0개. 에러는 TDS Toast/AlertDialog로 사용자에게 노출.

---

## Data Models

### Offer — 직장(현재/제안) 1건

```ts
export type OfferKind = 'current' | 'offer';

export interface Offer {
  id: string;                    // crypto.randomUUID() 대체: `o_${Date.now()}_${counter}` (호환성)
  kind: OfferKind;               // 'current' 1건 고정, 'offer' 최대 3건
  companyName: string;           // 1~20자, 필수
  baseSalaryManwon: number;      // 연봉(만원), 정수, 1,000 ~ 50,000
  bonusManwon: number;           // 연간 상여(만원), 정수, 0 ~ 20,000
  welfarePointManwon: number;    // 연간 복지포인트(만원), 정수, 0 ~ 1,000
  remoteDaysPerWeek: number;     // 주당 재택일, 정수, 0 ~ 5
  commuteMinutesOneWay: number;  // 편도 통근(분), 정수, 0 ~ 180
  commuteCostPerDayWon: number;  // 1일 왕복 교통비(원), 정수, 0 ~ 50,000
  lunchCostPerDayWon: number;    // 1일 점심값(원), 정수, 0 ~ 50,000, 회사 지원 시 0
  growthScore: number;           // 성장성 자기평가, 정수, 1 ~ 5
  cultureScore: number;          // 조직문화 자기평가, 정수, 1 ~ 5
  stabilityScore: number;        // 고용안정성 자기평가, 정수, 1 ~ 5
  createdAt: number;             // epoch ms
  updatedAt: number;             // epoch ms
}
```

제약:
- `kind: 'current'` 레코드는 최대 1건. 신규 저장 시 기존 레코드를 덮어쓴다.
- `kind: 'offer'` 레코드는 최대 3건. 4번째 저장 시도는 거부하고 에러 메시지 표시.
- 모든 숫자 필드는 `Number.isInteger` && 범위 내여야 저장 가능.

### Weights — 비금전 항목 가중치

```ts
export interface Weights {
  money: number;      // 0 ~ 10, 기본 5
  remote: number;     // 0 ~ 10, 기본 5
  commute: number;    // 0 ~ 10, 기본 5
  growth: number;     // 0 ~ 10, 기본 5
  culture: number;    // 0 ~ 10, 기본 5
  stability: number;  // 0 ~ 10, 기본 5
  updatedAt: number;
}
```

제약: 6개 값 합이 0이면 저장 거부(정규화 불가). 각 값은 0~10 정수.

### ScoreBreakdown — 계산 결과(저장하지 않는 파생값)

```ts
export interface AxisScore {
  axis: 'money' | 'remote' | 'commute' | 'growth' | 'culture' | 'stability';
  label: string;          // '실수령', '재택', '통근', '성장성', '조직문화', '안정성'
  rawCurrent: number;     // 정규화 전 현재 값
  rawTarget: number;      // 정규화 전 대상 값
  normCurrent: number;    // 0~100
  normTarget: number;     // 0~100
  weight: number;         // 0~10
  weightedCurrent: number;// normCurrent * weight
  weightedTarget: number; // normTarget * weight
}

export interface MoneyBreakdown {
  currentMonthlyNetWon: number;  // 현재 월 실수령 상당액(원, 정수 반올림)
  targetMonthlyNetWon: number;   // 제안 월 실수령 상당액(원, 정수 반올림)
  diffMonthlyWon: number;        // target - current
  diffYearlyWon: number;         // diffMonthlyWon * 12
  currentTaxWon: number;         // 연간 공제 추정액
  targetTaxWon: number;
}

export type Verdict = 'strong_move' | 'lean_move' | 'neutral' | 'lean_stay' | 'strong_stay';

export interface ScoreResult {
  currentOfferId: string;
  targetOfferId: string;
  axes: AxisScore[];             // 항상 length 6, 위 axis 순서 고정
  totalCurrent: number;          // 0~100, 소수점 1자리 반올림
  totalTarget: number;           // 0~100, 소수점 1자리 반올림
  gap: number;                   // totalTarget - totalCurrent, 소수점 1자리
  money: MoneyBreakdown;
  verdict: Verdict;
  negotiationPoints: string[];   // 정확히 3개
  computedAt: number;
}
```

### UnlockState — 리워드 광고 해제 상태

```ts
export interface UnlockState {
  unlockedComparisonKeys: string[]; // `${currentOfferId}:${targetOfferId}` 형식
  updatedAt: number;
}
```

### AppMeta — 앱 메타

```ts
export interface AppMeta {
  schemaVersion: 1;
  calcNoticeAcknowledged: boolean; // "규칙 기반 계산" 고지 확인 여부
  onboardedAt: number | null;
}
```

### localStorage 키 & 크기 추정

| 키 | 값 타입 | 형태 | 크기 추정 |
|---|---|---|---|
| `jod.offers.v1` | `Offer[]` | 최대 4건(current 1 + offer 3) | 1건 ≈ 380 bytes → 최대 ≈ 1.6 KB |
| `jod.weights.v1` | `Weights` | 단일 객체 | ≈ 140 bytes |
| `jod.unlock.v1` | `UnlockState` | 키 최대 3개 | ≈ 220 bytes |
| `jod.meta.v1` | `AppMeta` | 단일 객체 | ≈ 100 bytes |

총계 ≈ **2.1 KB** (5MB 한도 대비 0.05% 미만). 이미지 저장은 blob을 localStorage에 넣지 않고 즉시 다운로드 트리거하므로 저장 용량 증가 없음.

접근 규칙:
- 모든 읽기는 템플릿 localStorage 헬퍼를 통해 try/catch로 감싸고, JSON 파싱 실패 시 기본값을 반환한다(throw 금지).
- 쓰기 실패(`QuotaExceededError` 포함) 시 TDS Toast로 "저장 공간이 부족합니다. 오퍼를 삭제 후 다시 시도해주세요." 표시.

---

## 계산 규칙 (결정론적, 순수 함수 — `src/lib/calc.ts`)

### 1) 월 실수령 상당액

```
annualGrossWon = (baseSalaryManwon + bonusManwon) * 10_000
effectiveTaxRate = 다음 구간표에 따른 실효세율(4대보험 포함 근사)
  annualGrossWon <  30_000_000 → 0.10
  30,000,000 이상 ~ < 50,000,000 → 0.14
  50,000,000 이상 ~ < 70,000,000 → 0.18
  70,000,000 이상 ~ < 100,000,000 → 0.23
  100,000,000 이상 → 0.28
annualNetWon = round(annualGrossWon * (1 - effectiveTaxRate))
annualWelfareWon = welfarePointManwon * 10_000
officeDaysPerYear = (5 - remoteDaysPerWeek) * 46   // 연 46주 근무 가정
annualCommuteCostWon = officeDaysPerYear * commuteCostPerDayWon
annualLunchCostWon   = officeDaysPerYear * lunchCostPerDayWon
monthlyNetWon = round((annualNetWon + annualWelfareWon - annualCommuteCostWon - annualLunchCostWon) / 12)
```

### 2) 축별 원시값(raw)

| axis | raw 값 | 방향 |
|---|---|---|
| money | `monthlyNetWon` | 클수록 좋음 |
| remote | `remoteDaysPerWeek` | 클수록 좋음 |
| commute | `commuteMinutesOneWay` | **작을수록 좋음** |
| growth | `growthScore` | 클수록 좋음 |
| culture | `cultureScore` | 클수록 좋음 |
| stability | `stabilityScore` | 클수록 좋음 |

### 3) 정규화 (두 값 상대 비교, 0~100)

```
higherIsBetter 축:
  if (rawCurrent === rawTarget) → normCurrent = normTarget = 50
  else max = Math.max(rawCurrent, rawTarget), min = Math.min(...)
       norm(x) = round(((x - min) / (max - min)) * 60 + 40)   // 40~100 범위로 압축
lowerIsBetter 축(commute): 위 식에 x를 (max + min - x)로 치환 후 동일 적용
```
→ 항상 우세 축은 100, 열세 축은 40, 동률은 둘 다 50.

### 4) 총점

```
sumWeight = money+remote+commute+growth+culture+stability (Weights)
totalX = round( Σ(normX_axis * weight_axis) / sumWeight , 소수1자리 )
gap = round(totalTarget - totalCurrent, 소수1자리)
```

### 5) 판정 (verdict)

| 조건 (gap 기준) | verdict | 표시 문구 |
|---|---|---|
| gap >= 15 | `strong_move` | "이직 강력 추천" |
| 5 <= gap < 15 | `lean_move` | "이직 우세" |
| -5 < gap < 5 | `neutral` | "박빙 — 추가 협상 필요" |
| -15 < gap <= -5 | `lean_stay` | "잔류 우세" |
| gap <= -15 | `strong_stay` | "잔류 강력 추천" |

### 6) 협상 포인트 (정확히 3개, 결정론적 선택)

열세 축(=`normTarget < normCurrent`)을 `weight` 내림차순, 동률 시 axis 고정 순서(money→remote→commute→growth→culture→stability)로 정렬해 상위 3개를 매핑한다. 열세 축이 3개 미만이면 아래 fallback 문구로 3개를 채운다.

| axis | 협상 포인트 문구 템플릿 |
|---|---|
| money | `"월 실수령이 {absDiff}원 낮습니다. 연봉을 {needManwon}만원 이상 올려 협상하세요."` (`needManwon = ceil(|diffYearlyWon| / (1 - taxRate) / 10000)`) |
| remote | `"재택이 주 {d}일 적습니다. 주 {d}일 재택 보장을 서면으로 요청하세요."` |
| commute | `"편도 통근이 {m}분 깁니다. 유연출근제 또는 교통비 지원을 요청하세요."` |
| growth | `"성장성 평가가 낮습니다. 담당 업무 범위와 승진 트랙을 서면 확인하세요."` |
| culture | `"조직문화 평가가 낮습니다. 팀 리더와 1:1 미팅을 입사 전 요청하세요."` |
| stability | `"고용안정성 평가가 낮습니다. 계약 형태와 수습 조건을 문서로 확인하세요."` |
| fallback 1 | `"사이닝 보너스를 요청하세요. 통상 연봉의 10~20%가 협상 범위입니다."` |
| fallback 2 | `"입사일을 2주 이상 늦춰 현 직장 잔여 연차·상여를 확보하세요."` |
| fallback 3 | `"스톡옵션·RSU 여부와 베스팅 조건을 서면으로 확인하세요."` |

fallback은 1→2→3 순으로 부족분만큼 사용한다.

---

## Feature List

### F1. 데이터 레이어 & 계산 엔진

- **Description**: Offer/Weights/UnlockState/AppMeta의 localStorage CRUD 헬퍼와, 실수령 계산·정규화·총점·판정·협상 포인트를 만드는 순수 함수 모듈을 구현한다. UI가 전혀 없는 순수 로직 계층으로, 모든 상위 기능이 이 계층에만 의존한다. 모든 함수는 입력이 같으면 항상 같은 출력을 반환한다.
- **Data**: Offer, Weights, UnlockState, AppMeta, ScoreResult
- **API**: 없음 (외부 호출 없음)
- **Requirements**: `src/lib/storage.ts`, `src/lib/calc.ts`, `src/lib/types.ts`

- **AC-1 [U][P0]**: Scenario: 실수령 계산 결정론
  Given `calcMonthlyNet` 함수가 있을 때
  When `{ baseSalaryManwon: 6000, bonusManwon: 600, welfarePointManwon: 120, remoteDaysPerWeek: 2, commuteCostPerDayWon: 3000, lunchCostPerDayWon: 9000 }` 입력
  Then `annualGrossWon = 66,000,000`, `effectiveTaxRate = 0.18`, `annualNetWon = 54,120,000`, `officeDaysPerYear = 138`, `annualCommuteCostWon = 414,000`, `annualLunchCostWon = 1,242,000`
  And 반환값 `monthlyNetWon === 4,538,000` (= round((54,120,000 + 1,200,000 − 414,000 − 1,242,000)/12))
  And 동일 입력을 10회 호출해도 반환값이 모두 동일함

- **AC-2 [U][P0]**: Scenario: 정규화 및 총점 산출
  Given 현재 `{ remoteDaysPerWeek: 0 }`, 제안 `{ remoteDaysPerWeek: 3 }`, weights.remote = 8일 때
  When `buildScoreResult(current, target, weights)` 호출
  Then remote 축의 `normCurrent === 40`, `normTarget === 100`
  And 현재/제안 `commuteMinutesOneWay`가 모두 30이면 commute 축의 `normCurrent === 50` 그리고 `normTarget === 50`
  And `axes.length === 6` 이며 axis 순서는 `['money','remote','commute','growth','culture','stability']`

- **AC-3 [E][P0]**: Scenario: 판정 경계값
  Given `buildScoreResult`가 gap을 산출했을 때
  When gap = 15.0 이면 `verdict === 'strong_move'`
  And gap = 14.9 이면 `verdict === 'lean_move'`
  And gap = 4.9 이면 `verdict === 'neutral'`
  And gap = -5.0 이면 `verdict === 'lean_stay'`
  And gap = -15.0 이면 `verdict === 'strong_stay'`

- **AC-4 [U][P0]**: Scenario: 협상 포인트 3개 보장
  Given 제안 직장이 모든 축에서 우세할 때(열세 축 0개)
  When `buildScoreResult` 호출
  Then `negotiationPoints.length === 3`
  And `negotiationPoints[0] === "사이닝 보너스를 요청하세요. 통상 연봉의 10~20%가 협상 범위입니다."`
  And 배열에 중복 문자열이 없음

- **AC-5 [W][P1]**: Scenario: 손상된 localStorage 복구
  Given `localStorage['jod.offers.v1']`에 문자열 `"{not-json"` 이 저장되어 있을 때
  When `loadOffers()` 호출
  Then 빈 배열 `[]`을 반환하고 예외를 throw 하지 않음
  And `console.error`를 호출하지 않음

- **AC-6 [W][P1]**: Scenario: 저장 용량 초과
  Given `localStorage.setItem`이 `QuotaExceededError`를 던지는 상태일 때
  When `saveOffer(offer)` 호출
  Then 반환값이 `{ ok: false, error: "저장 공간이 부족합니다. 오퍼를 삭제 후 다시 시도해주세요." }`
  And 예외가 호출부로 전파되지 않음

- **AC-7 [W][P1]**: Scenario: 범위 밖 입력 거부
  Given `validateOffer` 함수가 있을 때
  When `{ companyName: "", baseSalaryManwon: 999, commuteMinutesOneWay: 181, growthScore: 6 }` 검증
  Then 반환 에러 배열이 `["회사명을 입력해주세요", "연봉은 1,000만원 이상 50,000만원 이하로 입력해주세요", "통근시간은 0분 이상 180분 이하로 입력해주세요", "성장성은 1점 이상 5점 이하로 선택해주세요"]` 를 모두 포함

- **AC-8 [S][P1]**: Scenario: 데이터 미존재 시 기본값
  Given localStorage에 `jod.weights.v1` 키가 없을 때
  When `loadWeights()` 호출
  Then `{ money: 5, remote: 5, commute: 5, growth: 5, culture: 5, stability: 5 }` 를 반환

---

### F2. 홈 대시보드

- **Description**: 앱 진입 화면으로 현재 직장 등록 여부와 저장된 제안 오퍼 목록을 보여주고, 각 오퍼의 예상 월 실수령 차액을 요약 표시한다. 오퍼가 없을 때는 빈 상태 안내와 함께 등록 CTA를 노출한다. 최초 진입 시 계산 방식 고지 다이얼로그를 1회 표시한다.
- **Data**: Offer, AppMeta
- **API**: 없음

- **AC-1 [S][P1]**: Scenario: 빈 상태
  Given `jod.offers.v1`이 빈 배열일 때
  When `/` 진입
  Then TDS `Asset.ContentIcon`과 "현재 직장부터 등록해보세요" 문구가 표시됨
  And `data-testid="empty-state"` 요소가 존재
  And 하단 SubmitFooter에 "현재 직장 등록" TDS Button(display="block")이 표시됨

- **AC-2 [E][P0]**: Scenario: 오퍼 목록 렌더
  Given `kind:'current'` 1건과 `kind:'offer'` 2건(회사명 "A사","B사")이 저장돼 있을 때
  When `/` 진입
  Then `data-testid="offer-card"` 요소가 정확히 2개 렌더됨
  And 각 카드에 회사명과 "월 실수령 {n}원" 텍스트가 표시됨
  And 각 카드 탭 시 `navigate('/compare', { state: { targetOfferId } })` 실행

- **AC-3 [U][P0]**: Scenario: 히어로 요약 표기
  Given 현재 직장과 오퍼가 1건 이상 있을 때
  Then `data-testid="summary-hero"` 요소에 최고 실수령 오퍼의 월 차액이 CountUp으로 표시됨
  And 값 옆에 "vs 현재 직장" 캡션이 표시됨
  And 오퍼가 2건 이상이면 `data-testid="offer-minibar"` MiniBar로 오퍼별 실수령 비율이 표시됨

- **AC-4 [E][P0]**: Scenario: 계산 방식 최초 고지
  Given `jod.meta.v1.calcNoticeAcknowledged`가 `false`일 때
  When `/` 최초 진입
  Then TDS AlertDialog에 "이 앱의 점수와 추천은 입력값 기반 규칙 계산 결과이며 법률·세무 자문이 아닙니다" 문구가 1회 표시됨
  And "확인" 버튼 탭 시 `jod.meta.v1.calcNoticeAcknowledged = true` 로 저장되고 재진입 시 다시 표시되지 않음

- **AC-5 [W][P1]**: Scenario: 현재 직장 없이 오퍼 등록 시도
  Given `kind:'current'` 레코드가 없을 때
  When "제안 직장 추가" 버튼 탭
  Then TDS Toast에 "현재 직장을 먼저 등록해주세요" 표시
  And `/offer/new` 로 이동하지 않음

- **AC-6 [W][P1]**: Scenario: 오퍼 4개째 추가 차단
  Given `kind:'offer'` 레코드가 3건 있을 때
  When "제안 직장 추가" 버튼 탭
  Then TDS Toast에 "제안 직장은 최대 3개까지 비교할 수 있어요" 표시
  And `data-testid="offer-card"` 개수가 3으로 유지됨

- **AC-7 [S][P1]**: Scenario: 로딩 상태
  Given localStorage 읽기가 완료되기 전일 때
  Then `data-testid="home-skeleton"` TDS Skeleton이 표시되고 빈 상태 문구는 표시되지 않음

- **AC-8 [U][P2]**: Scenario: 광고 배치
  Given 오퍼 목록이 렌더된 상태일 때
  Then `<AdSlot />` 배너가 목록 섹션과 하단 SubmitFooter 사이에 배치됨
  And 배너가 어떤 오퍼 카드도 가리지 않음(카드 영역과 겹치는 좌표 없음)

---

### F3. 직장 정보 입력/수정

- **Description**: 현재 직장 또는 제안 직장의 연봉·상여·복지포인트·재택·통근·점심값·정성 점수를 입력받아 검증 후 localStorage에 저장한다. 모바일 키보드 대응(숫자 필드는 numeric 키패드, 포커스 시 스크롤 보정)을 포함한다. 기존 오퍼 진입 시 값이 프리필된 수정 모드로 동작한다.
- **Data**: Offer
- **API**: 없음

- **AC-1 [E][P0]**: Scenario: 신규 오퍼 저장
  Given `/offer/new` 에 `state = { kind: 'offer' }` 로 진입했을 때
  When `{ companyName: "카카오", baseSalaryManwon: 7000, bonusManwon: 800, welfarePointManwon: 200, remoteDaysPerWeek: 3, commuteMinutesOneWay: 25, commuteCostPerDayWon: 2800, lunchCostPerDayWon: 0, growthScore: 4, cultureScore: 4, stabilityScore: 3 }` 입력 후 "저장" 탭
  Then `jod.offers.v1`에 해당 레코드가 추가되고 TDS Toast "저장했어요" 표시
  And `navigate('/', { replace: true })` 로 이동

- **AC-2 [E][P0]**: Scenario: 현재 직장 덮어쓰기
  Given `kind:'current'` 레코드가 이미 1건 존재할 때
  When `/offer/new` 에 `state = { kind: 'current' }` 로 진입해 저장
  Then `jod.offers.v1` 내 `kind==='current'` 레코드 수가 1로 유지됨
  And 기존 레코드의 `id`가 유지되고 `updatedAt`만 갱신됨

- **AC-3 [E][P0]**: Scenario: 수정 모드 프리필
  Given `/offer/:id/edit` 에 저장된 오퍼 id로 진입했을 때
  Then 모든 TDS TextField와 Chip 선택값이 저장된 값과 일치하게 프리필됨
  And 상단 Top 타이틀이 "{companyName} 수정"으로 표시됨

- **AC-4 [W][P1]**: Scenario: 빈 회사명 거부
  Given 입력 폼에서 다른 값은 모두 유효할 때
  When `companyName: ""` 로 "저장" 탭
  Then TDS TextField 하단에 "회사명을 입력해주세요" 에러 텍스트 표시
  And localStorage가 변경되지 않음

- **AC-5 [W][P1]**: Scenario: 범위 밖 숫자 거부
  Given 입력 폼일 때
  When `{ baseSalaryManwon: 60000, commuteMinutesOneWay: 200 }` 로 "저장" 탭
  Then "연봉은 1,000만원 이상 50,000만원 이하로 입력해주세요" 와 "통근시간은 0분 이상 180분 이하로 입력해주세요" 가 각 필드 하단에 동시 표시됨
  And 첫 번째 에러 필드로 스크롤 이동

- **AC-6 [U][P1]**: Scenario: 모바일 키보드 대응
  Given 숫자 입력 필드일 때
  Then 모든 숫자 TDS TextField는 `inputMode="numeric"`, `pattern="[0-9]*"` 속성을 가짐
  And 포커스 시 해당 필드가 화면 하단 고정 SubmitFooter에 가려지지 않도록 `scrollIntoView({ block: 'center' })` 가 호출됨
  And 키보드 표시 중에도 SubmitFooter의 "저장" 버튼 높이가 44px 이상 유지됨

- **AC-7 [S][P1]**: Scenario: 저장 중 상태
  Given "저장" 버튼을 탭한 직후일 때
  Then 버튼이 TDS Button `loading` 상태로 전환되고 중복 탭이 무시됨(저장 레코드 1건만 생성)

- **AC-8 [W][P1]**: Scenario: 존재하지 않는 오퍼 수정 진입
  Given `/offer/none-exists/edit` 로 진입했을 때
  Then "삭제되었거나 없는 오퍼예요" 안내와 `data-testid="not-found"` 요소가 표시됨
  And "홈으로" TDS Button 탭 시 `navigate('/', { replace: true })`

---

### F4. 가중치 설정

- **Description**: 6개 축(실수령·재택·통근·성장성·조직문화·안정성)의 중요도를 0~10 슬라이더로 조절해 저장한다. 변경 즉시 각 축의 상대 비중(%)을 미리보기로 보여준다. 저장된 가중치는 모든 비교 결과 계산에 즉시 반영된다.
- **Data**: Weights
- **API**: 없음

- **AC-1 [E][P0]**: Scenario: 가중치 저장
  Given `/weights` 진입 후 기본값 상태일 때
  When money 슬라이더를 9, commute 슬라이더를 2로 조절하고 "저장" 탭
  Then `jod.weights.v1`이 `{ money: 9, remote: 5, commute: 2, growth: 5, culture: 5, stability: 5 }` 로 저장됨
  And TDS Toast "가중치를 저장했어요" 표시 후 이전 화면으로 `navigate(-1)`

- **AC-2 [U][P0]**: Scenario: 비중 미리보기
  Given 가중치가 `{ money: 10, remote: 0, commute: 0, growth: 0, culture: 0, stability: 0 }` 일 때
  Then `data-testid="weight-preview"` 안에 money 항목이 "100%"로 표시됨
  And 나머지 5개 축은 각각 "0%"로 표시됨
  And 각 축 비중이 `data-testid="weight-minibar"` MiniBar로 시각화됨

- **AC-3 [W][P1]**: Scenario: 전부 0 거부
  Given 6개 슬라이더를 모두 0으로 설정했을 때
  When "저장" 탭
  Then TDS Toast "중요도를 최소 1개 이상 1점 이상으로 설정해주세요" 표시
  And `jod.weights.v1`이 변경되지 않음

- **AC-4 [E][P1]**: Scenario: 기본값 초기화
  Given 가중치를 변경한 상태일 때
  When "기본값으로 되돌리기" TDS Button 탭
  Then 6개 슬라이더가 모두 5로 리셋되고 미리보기가 각 "17%"(round(5/30*100)=17)로 갱신됨

- **AC-5 [U][P1]**: Scenario: 터치 타깃
  Given 슬라이더 6개가 렌더된 상태일 때
  Then 각 슬라이더 핸들의 터치 영역이 44x44px 이상
  And "기본값으로 되돌리기"와 "저장" 버튼 높이가 각각 44px 이상

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  Given localStorage 읽기 전일 때
  Then `data-testid="weights-skeleton"` TDS Skeleton 6줄이 표시되고 슬라이더는 렌더되지 않음

- **AC-7 [W][P1]**: Scenario: 저장 실패
  Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  When "저장" 탭
  Then TDS Toast "저장 공간이 부족합니다. 오퍼를 삭제 후 다시 시도해주세요." 표시
  And 화면이 그대로 유지되고 앱이 크래시하지 않음

- **AC-8 [U][P2]**: Scenario: 색상 규칙
  Given 가중치 화면의 모든 요소가 렌더된 상태일 때
  Then 소스 코드에 `#` 로 시작하는 HEX 색상 리터럴이 0개
  And 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값만 사용

---

### F5. 비교 계산 & 리워드 광고 게이트

- **Description**: 선택한 제안 오퍼와 현재 직장을 계산 엔진으로 비교하고, 요약(월 실수령 차액)까지는 무료로 보여준 뒤 종합 점수 비교표·판정·협상 포인트 3가지는 `TossRewardAd`로 게이트한다. 한 번 해제한 조합은 `UnlockState`에 저장되어 재시청 없이 다시 볼 수 있다.
- **Data**: Offer, Weights, ScoreResult(파생), UnlockState
- **API**: 없음

- **AC-1 [E][P0]**: Scenario: 리워드 광고 후 결과 공개
  Given `/compare` 에 `state = { targetOfferId: "o_1" }` 로 진입해 요약이 표시된 상태일 때
  When "종합 분석 보기" 버튼 탭 후 `TossRewardAd` 광고 시청이 완료됨
  Then `data-testid="score-table"`, `data-testid="verdict-card"`, `data-testid="negotiation-card"` 가 모두 표시됨
  And `jod.unlock.v1.unlockedComparisonKeys`에 `"{currentId}:o_1"` 이 추가됨

- **AC-2 [S][P0]**: Scenario: 잠금 상태 표시
  Given `unlockedComparisonKeys`에 해당 키가 없을 때
  When `/compare` 진입
  Then `data-testid="locked-panel"` 이 표시되고 `data-testid="score-table"` 은 DOM에 존재하지 않음
  And 월 실수령 차액 요약(`data-testid="summary-hero"`)은 광고 없이 표시됨

- **AC-3 [S][P0]**: Scenario: 재방문 시 자동 해제
  Given `unlockedComparisonKeys`에 `"{currentId}:o_1"` 이 이미 있을 때
  When `/compare` 에 `state = { targetOfferId: "o_1" }` 로 재진입
  Then 광고 노출 없이 `data-testid="score-table"` 이 즉시 표시됨

- **AC-4 [W][P1]**: Scenario: 광고 로드 실패
  Given 광고 로드가 실패하거나 사용자가 중도 이탈했을 때
  Then TDS Toast "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요." 표시
  And `unlockedComparisonKeys`에 키가 추가되지 않음
  And `data-testid="locked-panel"` 이 유지되고 "다시 시도" 버튼(높이 ≥44px)이 표시됨

- **AC-5 [W][P1]**: Scenario: 현재 직장 미등록 진입
  Given `kind:'current'` 레코드가 없을 때
  When `/compare` 진입
  Then "현재 직장을 먼저 등록해주세요" 안내와 "현재 직장 등록" TDS Button이 표시됨
  And 계산이 실행되지 않음(`score-table`, `locked-panel` 모두 미표시)

- **AC-6 [S][P1]**: Scenario: 계산 로딩
  Given "종합 분석 보기" 탭 후 결과 렌더 전일 때
  Then `data-testid="compare-skeleton"` TDS Skeleton이 표시됨
  And 계산은 1,000ms 이내 완료되어 스켈레톤이 사라짐

- **AC-7 [U][P0]**: Scenario: 결과 레이아웃 계약
  Given 해제된 비교 결과가 표시된 상태일 때
  Then 화면은 `ScreenScaffold`로 감싸짐
  And `data-testid="strategy-card"` 속성을 가진 TDS Card가 정확히 2개(현재 직장/제안 직장) 존재
  And 각 Card 내부 총점이 TDS Typography t2 이상 강조 타이포로 표시되고 우세 Card에 TDS Badge "우세"가 붙음
  And `data-testid="negotiation-card"` 안에 협상 포인트가 TDS ListRow로 정확히 3개 표시됨

- **AC-8 [U][P1]**: Scenario: 계산 결과 고지 및 광고 배치
  Given 해제된 결과가 표시된 상태일 때
  Then `data-testid="calc-notice"` 에 "입력값 기반 규칙 계산 결과입니다. 법률·세무 자문이 아닙니다" 텍스트가 표시됨
  And `<AdSlot />` 배너가 협상 포인트 카드 아래에만 배치되어 어떤 카드와도 겹치지 않음

---

### F6. 복수 오퍼 순위 비교

- **Description**: 저장된 제안 오퍼(최대 3건)를 현재 직장 대비 총점 기준으로 한 화면에서 순위 비교한다. 각 오퍼의 총점·월 실수령 차액·우세 축을 표로 보여주고, 축별 비교는 TDS Tab으로 전환한다. 상세 분석은 F5의 개별 비교 화면으로 연결한다.
- **Data**: Offer, Weights, ScoreResult(파생)
- **API**: 없음

- **AC-1 [E][P0]**: Scenario: 순위 정렬
  Given 오퍼 3건의 총점이 각각 72.0("A사"), 81.5("B사"), 65.2("C사")일 때
  When `/rank` 진입
  Then `data-testid="rank-row"` 요소가 3개이며 순서가 위에서부터 "B사","A사","C사"
  And 1위 행에 TDS Badge "1위"가 표시됨

- **AC-2 [U][P0]**: Scenario: 행 정보 계약
  Given 순위표가 렌더된 상태일 때
  Then 각 `data-testid="rank-row"` 는 TDS ListRow로 렌더되고 회사명, "총점 {n}", "월 {±n}원" 을 포함
  And 각 행 높이가 44px 이상이며 탭 시 `navigate('/compare', { state: { targetOfferId } })` 실행

- **AC-3 [E][P1]**: Scenario: 축별 탭 전환
  Given `/rank` 에서 TDS Tab "실수령"이 선택된 상태일 때
  When "통근" 탭 탭
  Then `data-testid="axis-minibar"` 가 각 오퍼의 통근 정규화 점수 비율로 갱신됨
  And 통근은 값이 작을수록 높은 비율로 표시됨(편도 10분 오퍼가 60분 오퍼보다 긴 막대)

- **AC-4 [S][P1]**: Scenario: 오퍼 1건 이하
  Given `kind:'offer'` 레코드가 0건일 때
  When `/rank` 진입
  Then `data-testid="empty-state"` 에 TDS `Asset.ContentIcon`과 "비교할 제안이 아직 없어요" 표시
  And "제안 직장 추가" TDS Button(display="block")이 하단에 표시됨

- **AC-5 [W][P1]**: Scenario: 가중치 합 0 방어
  Given `jod.weights.v1`이 외부 조작으로 6개 값 모두 0일 때
  When `/rank` 진입
  Then 기본 가중치(전부 5)로 계산해 순위표를 렌더하고 TDS Toast "중요도 설정이 초기화되었어요" 표시
  And 앱이 크래시하지 않고 `NaN` 문자열이 화면에 표시되지 않음

- **AC-6 [S][P1]**: Scenario: 로딩 상태
  Given 계산 완료 전일 때
  Then `data-testid="rank-skeleton"` TDS Skeleton 3줄이 표시되고 순위 행은 렌더되지 않음

- **AC-7 [E][P1]**: Scenario: 오퍼 삭제
  Given 순위표에 3건이 있을 때
  When 행을 좌측 스와이프해 "삭제" 탭하고 TDS AlertDialog에서 "삭제" 확정
  Then 해당 레코드가 `jod.offers.v1`에서 제거되고 `data-testid="rank-row"` 개수가 2로 감소
  And TDS Toast "삭제했어요" 표시

- **AC-8 [U][P2]**: Scenario: 스크롤 동작
  Given 순위 행은 최대 3개로 제한되므로
  Then 가상 스크롤을 사용하지 않고 일반 세로 스크롤만 사용
  And 축별 비교 섹션이 화면을 넘어갈 경우 페이지 전체 세로 스크롤로 접근 가능하며 가로 스크롤은 발생하지 않음

---

### F7. 결과 이미지 저장

- **Description**: 해제된 비교 결과 카드를 PNG 이미지로 렌더해 사용자 기기에 저장한다. 캔버스 렌더는 클라이언트에서만 수행하며 외부 서버 전송이 없다. 저장 실패 시 대체 안내를 제공한다.
- **Data**: ScoreResult(파생), Offer
- **API**: 없음 (외부 전송 없음)

- **AC-1 [E][P0]**: Scenario: 이미지 저장 성공
  Given `/compare` 결과가 해제된 상태일 때
  When "결과 이미지 저장" TDS Button 탭
  Then `data-testid="capture-area"` 영역이 PNG blob으로 변환되고 파일명 `joboffer-{targetCompanyName}-{YYYYMMDD}.png` 로 다운로드가 트리거됨
  And TDS Toast "이미지를 저장했어요" 표시

- **AC-2 [U][P0]**: Scenario: 캡처 영역 계약
  Given 캡처가 실행될 때
  Then `data-testid="capture-area"` 안에는 두 개의 `data-testid="strategy-card"`, 판정 배지, 협상 포인트 3개, `data-testid="calc-notice"` 가 포함됨
  And `<AdSlot />` 배너는 캡처 영역 밖에 위치해 이미지에 포함되지 않음

- **AC-3 [S][P1]**: Scenario: 생성 중 상태
  Given "결과 이미지 저장" 탭 직후일 때
  Then 버튼이 TDS Button `loading` 상태가 되고 중복 탭이 무시되어 다운로드가 1회만 트리거됨

- **AC-4 [W][P1]**: Scenario: 캔버스 렌더 실패
  Given 캔버스 변환이 실패(blob이 null)했을 때
  Then TDS Toast "이미지를 만들지 못했어요. 화면 캡처를 이용해주세요." 표시
  And 앱이 크래시하지 않고 결과 화면이 그대로 유지됨

- **AC-5 [W][P0]**: Scenario: 외부 이탈 금지
  Given 이미지 저장 기능이 동작할 때
  Then `window.open` 및 `window.location.href` 로 외부 도메인 이동을 수행하지 않음
  And 다운로드는 동일 오리진 `blob:` URL과 `<a download>` 로만 처리하며 사용 후 `URL.revokeObjectURL` 호출

- **AC-6 [W][P1]**: Scenario: 잠금 상태에서 저장 시도
  Given 비교 결과가 아직 해제되지 않은 상태일 때
  Then "결과 이미지 저장" 버튼이 렌더되지 않음(DOM에 존재하지 않음)

- **AC-7 [U][P1]**: Scenario: 이미지 색상 안전
  Given 캡처 이미지가 생성될 때
  Then 캡처 대상 요소에 HEX 하드코딩 색상이 사용되지 않고 `var(--tds-color-*)` 계산값이 적용됨
  And 다크모드에서도 텍스트와 배경 대비가 유지되어 글자가 배경과 동일 색으로 렌더되지 않음

- **AC-8 [U][P2]**: Scenario: 터치 타깃
  Given 저장 버튼이 표시될 때
  Then 버튼 높이가 44px 이상이며 `display="block"` 으로 가로 폭 전체를 차지함

---

### F8. 앱 정책 준수 가드

- **Description**: 토스 검수 기준(외부 이탈 금지, 콘솔 에러 0, 색상 하드코딩 금지, 호환성, 외부 로깅 금지)을 코드 레벨에서 강제하는 공통 가드와 린트 규칙을 구성한다. 프로덕션 빌드 산출물과 소스 트리를 대상으로 자동 검증 가능한 형태로 정의한다.
- **Data**: 없음
- **API**: 없음

- **AC-1 [W][P0]**: Scenario: 외부 도메인 이탈 차단
  Given 앱의 전체 소스 트리(`src/**`)를 검사할 때
  Then `window.open(` 호출이 0건
  And `window.location.href = ` 로 `http://` 또는 `https://` 문자열을 대입하는 코드가 0건

- **AC-2 [U][P0]**: Scenario: 콘솔 에러 0개
  Given `npm run build` 산출물을 실행해 홈 → 입력 → 가중치 → 비교 → 순위 화면을 순차 방문했을 때
  Then `console.error` 출력이 0건
  And 처리되지 않은 Promise rejection이 0건

- **AC-3 [W][P0]**: Scenario: HEX 색상 하드코딩 금지
  Given `src/**/*.{ts,tsx,css}` 를 정규식 `#[0-9a-fA-F]{3,8}\b` 로 검사할 때
  Then 매칭 건수가 0
  And 모든 색상 지정은 `var(--tds-color-*)` 또는 TDS 컴포넌트 prop으로만 이뤄짐

- **AC-4 [W][P0]**: Scenario: 외부 로깅/분석 SDK 금지
  Given `package.json` dependencies와 `index.html` 을 검사할 때
  Then `google-analytics`, `gtag`, `amplitude`, `mixpanel`, `sentry` 문자열이 0건
  And 외부 도메인으로의 `fetch`/`XMLHttpRequest` 호출이 소스 트리에 0건

- **AC-5 [U][P0]**: Scenario: 금지 UI 라이브러리 미사용
  Given `package.json` dependencies를 검사할 때
  Then `@mui/*`, `antd`, `@chakra-ui/*`, `shadcn` 패키지가 0건
  And UI 컴포넌트 import는 `@toss/tds-mobile` 또는 `src/components/*` 에서만 발생

- **AC-6 [U][P1]**: Scenario: 구형 OS 호환
  Given 소스 트리를 검사할 때
  Then `.at(`, `Object.groupBy`, `structuredClone(`, `Array.prototype.findLast`, CSS `:has(` 사용이 0건
  And `crypto.randomUUID()` 대신 `o_${Date.now()}_${counter}` 방식 id 생성 사용

- **AC-7 [W][P1]**: Scenario: 앱 설치 유도 문구 금지
  Given 화면에 렌더되는 모든 한국어 문자열을 검사할 때
  Then "앱을 설치", "다운로드하세요", "스토어에서" 문구가 0건
  And 외부 웹/앱으로 이동하는 링크가 0건

- **AC-8 [U][P1]**: Scenario: 프로모션 지급 한도
  Given 소스 트리에서 `grantPromotionReward` 호출을 검사할 때
  Then 호출이 0건이거나, 호출 시 `amount <= 5000` 을 검증하는 가드 코드가 호출 직전에 존재함

---

## Screen Definitions

### S1. 홈 (`/`) — F2

- **TDS 컴포넌트**: `ScreenScaffold`, TDS Top(타이틀 "이직 결정기"), TDS Card(오퍼 카드), TDS ListRow(오퍼 요약행), TDS Typography(t2 히어로 값 / t5 캡션), TDS Badge(최고 실수령 표시), TDS Button(SubmitFooter 내 display="block"), TDS AlertDialog(계산 고지), TDS Toast(에러), TDS Skeleton(로딩), TDS `Asset.ContentIcon`(빈 상태), `AdSlot`, `FloatingTabBar`.
- **표현**: `SummaryHero`에 최고 오퍼 월 차액 CountUp, 오퍼 2건 이상이면 `MiniBar`(`data-testid="offer-minibar"`)로 실수령 비율 표시.
- **Loading**: `data-testid="home-skeleton"` TDS Skeleton 3줄.
- **Empty**: `data-testid="empty-state"` — `Asset.ContentIcon` + "현재 직장부터 등록해보세요" + CTA.
- **Error**: localStorage 파싱 실패 → 빈 상태로 폴백 + Toast "저장된 데이터를 불러오지 못했어요".
- **Touch**: 오퍼 카드 최소 높이 64px, SubmitFooter 버튼 높이 48px, FloatingTabBar 아이템 44x44px 이상.
- **Ad**: `<AdSlot />` — 오퍼 목록 섹션 아래, SubmitFooter 위. 콘텐츠와 비겹침.
- **Navigation state contract**
  - Incoming: `location.state = undefined`
  - Outgoing:
    - "현재 직장 등록" → `navigate('/offer/new', { state: { kind: 'current' } as { kind: OfferKind } })`
    - "제안 직장 추가" → `navigate('/offer/new', { state: { kind: 'offer' } as { kind: OfferKind } })`
    - 오퍼 카드 탭 → `navigate('/compare', { state: { targetOfferId: string } })`
    - 오퍼 카드 "수정" → `navigate('/offer/' + id + '/edit')` (state 없음)
- **Layout 계약**: `ScreenScaffold` 필수. 1차 액션은 `SubmitFooter`. 오퍼 요약은 TDS Card로 묶어 위계 표현(맨 div 나열 금지).

### S2. 직장 정보 입력/수정 (`/offer/new`, `/offer/:id/edit`) — F3

- **TDS 컴포넌트**: `ScreenScaffold`, TDS Top(뒤로가기), TDS TextField(회사명/연봉/상여/복지포인트/통근시간/교통비/점심값), TDS Chip(재택일수 0~5, 성장성·조직문화·안정성 각 1~5), TDS Typography(섹션 타이틀), TDS Spacing(size 필수), `SubmitFooter` + TDS Button(display="block", "저장"), TDS Toast, TDS AlertDialog(수정 이탈 확인).
- **Loading**: 수정 모드에서 오퍼 조회 전 `data-testid="form-skeleton"` TDS Skeleton.
- **Empty**: 해당 없음(폼 화면). 신규 모드는 기본값 0으로 프리필.
- **Error**: 필드별 TDS TextField `error`/헬퍼 텍스트. 존재하지 않는 id → `data-testid="not-found"`.
- **Touch**: 모든 Chip 44x44px 이상, TextField 높이 48px 이상, 저장 버튼 48px.
- **Keyboard**: 숫자 필드 `inputMode="numeric"` + `pattern="[0-9]*"`, 포커스 시 `scrollIntoView({ block: 'center' })`, SubmitFooter가 포커스 필드를 가리지 않음.
- **Scroll**: 단일 폼 세로 스크롤(항목 고정 개수 11개 → 가상 스크롤 불필요).
- **Navigation state contract**
  - Incoming(`/offer/new`): `location.state = { kind: 'current' | 'offer' }` — 없으면 `'offer'` 로 폴백
  - Incoming(`/offer/:id/edit`): `useParams<{ id: string }>()`, state 사용 안 함
  - Outgoing: 저장 성공 → `navigate('/', { replace: true })`; 취소/뒤로 → `navigate(-1)`
- **Layout 계약**: `ScreenScaffold` + `SubmitFooter`. 좌측 글자폭 버튼 금지.

### S3. 가중치 설정 (`/weights`) — F4

- **TDS 컴포넌트**: `ScreenScaffold`, TDS Top("중요도 설정"), TDS Slider 6개, TDS ListRow(축 라벨 + 현재 값), TDS Typography, `MiniBar`(`data-testid="weight-minibar"`), TDS Button("기본값으로 되돌리기" — display="block", secondary), `SubmitFooter` + TDS Button("저장"), TDS Toast, TDS Skeleton.
- **Loading**: `data-testid="weights-skeleton"` 6줄.
- **Empty**: 해당 없음(항상 기본값 존재).
- **Error**: 전부 0 저장 시 Toast; 저장 실패 시 Toast.
- **Touch**: 슬라이더 핸들 44x44px 이상, 버튼 48px.
- **Ad**: 미배치(설정 화면 — 표현 풍부함 규칙 생략 대상).
- **Navigation state contract**
  - Incoming: `location.state = undefined`
  - Outgoing: 저장/취소 → `navigate(-1)`
- **Layout 계약**: `ScreenScaffold` + `SubmitFooter`. 미리보기는 `data-testid="weight-preview"` 단일 TDS Card 안에 묶음.

### S4. 비교 결과 (`/compare`) — F5, F7

- **TDS 컴포넌트**: `ScreenScaffold`, TDS Top("{companyName} vs 현재"), TDS Card × 2(`data-testid="strategy-card"`), TDS Badge("우세", 판정 라벨), TDS Typography(총점 t2), TDS ListRow(축별 비교 6행, 협상 포인트 3행), TDS Tab(요약/축별), TDS Button("종합 분석 보기", "결과 이미지 저장" — display="block"), TDS Toast, TDS Skeleton, `TossRewardAd`, `AdSlot`, `SummaryHero`(CountUp), `Sparkline`(축별 정규화 추이), `MiniBar`(축별 비율).
- **Loading**: `data-testid="compare-skeleton"`.
- **Empty**: 현재 직장 미등록 → 안내 + "현재 직장 등록" 버튼.
- **Error**: 광고 실패 Toast + "다시 시도" 버튼; 이미지 저장 실패 Toast.
- **Locked**: `data-testid="locked-panel"` — 요약 히어로만 노출, 점수표/판정/협상 포인트는 DOM 미존재.
- **Touch**: 모든 버튼 48px, Tab 아이템 44px 이상.
- **Ad**: `TossRewardAd`가 종합 결과를 게이트. `<AdSlot />` 배너는 협상 포인트 카드 **아래**에만, 캡처 영역 밖에 배치.
- **Navigation state contract**
  - Incoming: `location.state = { targetOfferId: string }` — 없으면 첫 번째 `kind:'offer'` 레코드로 폴백, 그것도 없으면 `navigate('/', { replace: true })`
  - Outgoing: "현재 직장 등록" → `navigate('/offer/new', { state: { kind: 'current' } })`; "다른 오퍼 비교" → `navigate('/rank')`
- **Layout 계약**: `ScreenScaffold` 필수. 핵심 정보는 `data-testid="strategy-card"` TDS Card 2개로 묶고 총점은 t2 이상 + 우세 Badge. 협상 포인트는 `data-testid="negotiation-card"` Card 내부 ListRow 3개. `data-testid="capture-area"` 는 두 strategy-card + 판정 + 협상 카드 + `calc-notice` 를 감싸고 AdSlot을 포함하지 않음.

### S5. 순위 비교 (`/rank`) — F6

- **TDS 컴포넌트**: `ScreenScaffold`, TDS Top("오퍼 순위"), TDS ListRow(`data-testid="rank-row"` 최대 3행), TDS Badge("1위"), TDS Tab(축 6개 전환), `MiniBar`(`data-testid="axis-minibar"`), TDS AlertDialog(삭제 확인), TDS Toast, TDS Skeleton, TDS `Asset.ContentIcon`(빈 상태), `AdSlot`, `FloatingTabBar`.
- **Loading**: `data-testid="rank-skeleton"` 3줄.
- **Empty**: `data-testid="empty-state"` + "비교할 제안이 아직 없어요" + "제안 직장 추가" 버튼.
- **Error**: 가중치 이상 시 기본값 폴백 + Toast.
- **Touch**: 행 높이 56px 이상, 스와이프 삭제 액션 버튼 44x44px 이상, Tab 아이템 44px 이상.
- **Scroll**: 최대 3행이므로 가상 스크롤 미사용, 일반 세로 스크롤. 가로 스크롤 0.
- **Ad**: `<AdSlot />` — 순위표와 축별 비교 섹션 사이. 행과 비겹침.
- **Navigation state contract**
  - Incoming: `location.state = undefined`
  - Outgoing: 행 탭 → `navigate('/compare', { state: { targetOfferId: string } })`; "제안 직장 추가" → `navigate('/offer/new', { state: { kind: 'offer' } })`
- **Layout 계약**: `ScreenScaffold` 필수. 순위표는 단일 TDS Card로 묶음. 축별 비교 섹션은 별도 Card.

### 라우트 요약

| 경로 | 화면 | Incoming state 타입 |
|---|---|---|
| `/` | 홈 | `undefined` |
| `/offer/new` | 신규 입력 | `{ kind: 'current' \| 'offer' }` |
| `/offer/:id/edit` | 수정 | `undefined` (params 사용) |
| `/weights` | 가중치 | `undefined` |
| `/compare` | 비교 결과 | `{ targetOfferId: string }` |
| `/rank` | 순위 비교 | `undefined` |

FloatingTabBar 항목: 홈(`/`), 순위(`/rank`), 중요도(`/weights`) — 3개.

---

## API Contract

**해당 없음.** 이 앱은 외부 API를 호출하지 않는다. 모든 데이터는 localStorage에 저장되고 모든 계산은 클라이언트 순수 함수로 수행된다. 따라서 CORS 설정 대상이 없으며(F8 AC-4로 검증), 서버 배포도 없다.

향후 외부 API가 추가될 경우에만 적용할 규칙:
- 에러 응답 형태는 `{ error: string }` 로 통일
- 모든 필드에 명시적 TypeScript 타입 부여
- 호출은 Railway 별도 배포 서버로만 수행하며 CORS 허용 오리진 명시

---

## Assumptions

- **A1**: 실효세율 구간표(0.10 / 0.14 / 0.18 / 0.23 / 0.28)는 4대보험 포함 근사값이며, 실제 원천징수액과 다를 수 있다. 화면에 "규칙 계산 결과, 세무 자문 아님" 고지를 표시한다.
- **A2**: 연간 근무 주수는 46주로 고정 가정한다(연차·공휴일 반영).
- **A3**: 성장성·조직문화·안정성은 사용자 자기평가 1~5점이며 객관 데이터 소스를 사용하지 않는다.
- **A4**: 결과 이미지 저장은 캔버스 렌더 라이브러리로 클라이언트에서만 수행하며, 일부 구형 WebView에서 실패할 수 있어 F7 AC-4 폴백을 제공한다.
- **A5**: 본 앱은 생성형 AI를 사용하지 않으므로 "AI가 생성한 결과입니다" 고지 의무 비해당. 대신 규칙 기반 계산 고지를 F2 AC-4 / F5 AC-8로 강제한다. 만약 향후 LLM 기반 협상 문구 생성을 도입하면 AI 사전 고지 다이얼로그와 결과물 라벨 AC를 반드시 추가해야 한다.
- **A6**: 수익화는 배너 + 리워드 광고만 사용하며 IAP는 MVP 범위 밖이다.
- **A7**: 프로모션 리워드(`grantPromotionReward`)는 MVP에서 사용하지 않는다(F8 AC-8로 0건 검증).
- **A8**: 오퍼 데이터는 기기 로컬에만 저장되어 기기 변경 시 이전되지 않는다(동기화 서버 없음).

---

## Open Questions

- **Q1**: 실효세율 구간표를 사용자가 직접 조정할 수 있게 할지, 고정값으로 둘지? (현재 스펙: 고정)
- **Q2**: 판정 임계값(±5 / ±15)이 실제 사용자 체감과 맞는지 — 초기 배포 후 조정 필요 여부.
- **Q3**: 퇴직금·스톡옵션 항목을 입력 필드로 추가할지? (현재 스펙: 협상 포인트 문구로만 언급)
- **Q4**: 오퍼 3개 상한을 유지할지, 5개로 늘릴지 (localStorage 용량은 여유 있음 — UI 밀도 문제).
- **Q5**: 리워드 광고 해제 상태를 영구 저장할지, 30일 만료를 둘지? (현재 스펙: 영구)