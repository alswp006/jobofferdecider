# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** Core offer entity, used in 0004, 0005, 0006, 0013-0016 (구현: 패킷 0001) */
export type OfferInfo = { id: string; companyName: string; salary: number; bonus: number; benefits: string[]; negotiable: string[] };

/** Company details, used in 0005, 0007, 0010 (구현: 패킷 0001) */
export type CompanyInfo = { name: string; industry?: string; location?: string; size?: string };

/** Importance weights (0-100), used in 0005, 0006, 0007, 0011, 0013-0015 (구현: 패킷 0001) */
export type Weights = { salary: number; bonus: number; benefits: number; workLife: number };

/** Comparison verdict, used in 0006, 0013-0015 (구현: 패킷 0001) */
export type Verdict = { better: 'A' | 'B' | 'tie'; reason: string; negotiablePoints: string[] };

/** Current screen state, used in 0007, 0018 (구현: 패킷 0001) */
export type RouteState = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S5-compare';

/** Calculation output, used in 0013-0016 (구현: 패킷 0001) */
export type CalculationResult = { score: number; breakdown: { salary: number; bonus: number; benefits: number; workLife: number } };

/** Format amount as currency string, used in 0013-0016 (구현: 패킷 0004) */
export type calcMoneyFn = (amount: number, opts?: { locale?: string; decimals?: number }) => string;

/** Calculate composite score from offer and weights, used in 0013-0015 (구현: 패킷 0005) */
export type calcScoreFn = (offer: OfferInfo, weights: Weights) => CalculationResult;

/** Determine comparison winner and reasoning, used in 0015 (구현: 패킷 0006) */
export type getVerdictFn = (scoreA: CalculationResult, scoreB: CalculationResult, weights: Weights) => Verdict;

/** App state management hook, used in 0010-0015 (구현: 패킷 0007) */
export type useAppStateFn = () => { state: { route: RouteState; offerA?: OfferInfo; offerB?: OfferInfo; weights: Weights }; setRoute: (s: RouteState) => void; setOfferA: (o: OfferInfo) => void; setOfferB: (o: OfferInfo) => void; setWeights: (w: Weights) => void };

/** Validate company name input, used in 0010 (구현: 패킷 0008) */
export type validateCompanyNameFn = (name: string) => boolean;

/** Validate salary amount input, used in 0010 (구현: 패킷 0008) */
export type validateSalaryFn = (amount: string) => boolean;

/** Format user currency input, used in 0010 (구현: 패킷 0008) */
export type formatCurrencyInputFn = (input: string) => string;

/** Props for WeightSlider component, used in 0011 (구현: 패킷 0009) */
export type WeightSliderProps = { label: string; value: number; min: number; max: number; onChange: (v: number) => void; unit?: string };

/** Props for SaveResultImage component, used in 0013 (구현: 패킷 0016) */
export type SaveResultImageProps = { result: CalculationResult; offer: OfferInfo; onSave?: (blob: Blob) => void };

/** Props for OnboardingDialog component, used in 0018 (구현: 패킷 0017) */
export type OnboardingDialogProps = { isOpen: boolean; onClose: () => void };

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Domain types — add your app-specific types here
export {};

```