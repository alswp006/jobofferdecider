# Packet 0004 — Test Specification & Implementation Guide

## TDD Status: ✅ RED PHASE (Tests written, ready for implementation)

**Test File**: `src/__tests__/packet-0004.test.ts`  
**Test Count**: 25 tests across 5 AC groups  
**Status**: All tests failing (expected — awaiting implementation)

---

## Implementation Files to Create

### 1. `src/lib/score.ts`
**Exports**:
```typescript
export function buildScoreResult(
  current: Offer,
  target: Offer,
  weights: Weights
): ScoreResult
```

### 2. `src/lib/negotiation.ts`
**Exports**: Templates/functions for negotiation point generation  
(Exact API TBD by Coder based on score.ts implementation approach)

---

## Acceptance Criteria (Tested)

### AC-1[P0]: Normalization & Raw Score Extraction (3 tests)
- **Test**: `should normalize remote: 0 days → 40, 3 days → 100`
  - Remote axis with 0 days → `normCurrent = 40`, 3 days → `normTarget = 100`
  
- **Test**: `should normalize commute (minutes): equal values both → 50`
  - Commute axis when current=30 min & target=30 min → both `norm = 50` (no advantage)
  - **Commute reversal rule**: Longer commute = lower score (axis normalized inversely)

- **Test**: `should extract and normalize all 6 axes with correct raw values`
  - All axes must extract raw values correctly from Offer fields

---

### AC-2[P0]: axes Array Structure (3 tests)
- **Test**: `should have exactly 6 axes`
  - `result.axes.length === 6`

- **Test**: `should maintain AXIS_ORDER sequence: money, remote, commute, growth, culture, stability`
  - Order must match exactly: `["money", "remote", "commute", "growth", "culture", "stability"]`

- **Test**: `should include required properties in each AxisScore`
  - Each axis must have: `axis`, `label`, `rawCurrent`, `rawTarget`, `normCurrent`, `normTarget`, `weight`, `weightedCurrent`, `weightedTarget`

---

### AC-3[P0]: Verdict Based on Gap (5 tests)
Verdict boundaries (based on `gap = totalTarget - totalCurrent`):

| Gap | Verdict |
|-----|---------|
| ≥ 15.0 | `strong_move` |
| 5.0 < gap < 15.0 | `lean_move` |
| -5.0 ≤ gap ≤ 5.0 | `neutral` |
| -15.0 < gap ≤ -5.0 | `lean_stay` |
| ≤ -15.0 | `strong_stay` |

- Tests verify each boundary condition with concrete offer scenarios

---

### AC-4[P0]: negotiationPoints (협상 포인트) (5 tests)
- **Test**: `should return exactly 3 negotiation points when all axes favor offer`
  - `negotiationPoints.length === 3`

- **Test**: `should include specific signing bonus advice when no disadvantaged axes`
  - When **no axes have `normCurrent < normTarget`** (all favorable):
    ```
    negotiationPoints[0] === "사이닝 보너스를 요청하세요. 통상 연봉의 10~20%가 협상 범위입니다."
    ```

- **Test**: `should contain no duplicate strings in negotiationPoints`
  - `new Set(negotiationPoints).size === negotiationPoints.length`

- **Test**: `should generate different negotiation points for different scenarios`
  - Different gap/axis advantage scenarios → different point sets

---

### AC-5[P0]: DEFAULT_WEIGHTS Fallback (3 tests)
- **Test**: `should use DEFAULT_WEIGHTS when sumWeight === 0`
  - When `weights.money + weights.remote + ... + weights.stability === 0`, fall back to `DEFAULT_WEIGHTS`

- **Test**: `should calculate consistent scores whether using DEFAULT_WEIGHTS or zero weights`
  - Zero weights trigger fallback → same result as explicit `DEFAULT_WEIGHTS`
  - Verdict for equal weights on all axes should be `neutral` (no differentiation)

- **Test**: `should produce no NaN values in result when weights sum to zero`
  - `JSON.stringify(result).includes('NaN') === false`
  - All numeric fields must be finite: `totalCurrent`, `totalTarget`, `gap`, all `axis.norm*`/`weighted*`

---

### Additional Comprehensive Validations (7 tests)
- **Weighted Sum**: `totalCurrent` & `totalTarget` must equal sum of respective weighted scores (within 1 decimal place)
- **Decimal Formatting**: Totals formatted to 1 decimal place (e.g., 50.5, not 50.123456)
- **IDs**: `currentOfferId` and `targetOfferId` must match offer IDs
- **Timestamp**: `computedAt` must be valid timestamp (number > 0)
- **MoneyBreakdown**: All 6 fields present (`currentMonthlyNetWon`, `targetMonthlyNetWon`, `diffMonthlyWon`, `diffYearlyWon`, `currentTaxWon`, `targetTaxWon`)
- **Commute Reversal**: Shorter commute must have higher normalized score
- **Edge Cases**: Zero vs. max values handled without crash

---

## Normalization Rules (Inferred from Tests)

### Axes Normalization Formula
All axes normalize to 0–100 scale, then scale to 40–100:
- **money**: gross diff (baseline 0 = 40, best diff = 100) — **requires** `calcMonthlyNet` from `calc.ts`
- **remote**: days/week (0 = 40, 5 = 100)
- **commute**: minutes (reversed: long = low, short = high; 0 = 100, 9999 = 40)
- **growth/culture/stability**: 0–100 score (direct mapping, no transformation needed)

**Normalization function pattern**:
```
normScore = 40 + (weightedDifference / maxDifference) * 60
```

### Money Calculation
- Extract monthly net using `calcMonthlyNet({ base, bonus, welfare, remote, commute, lunch })` from `calc.ts`
- Use raw yearly difference as raw axis value (baseline for normalization)

---

## Test Quality Checklist ✅
- [x] Every AC has ≥1 test (P0 ACs have 2+ as needed)
- [x] Descriptive test names ("AC-1[P0]: should ...")
- [x] Each test has 2+ concrete assertions (values, lengths, boundary checks)
- [x] Happy path + boundary edge cases included
- [x] No vague assertions (`toBeTruthy()`, `toBeDefined()` alone)
- [x] Concrete offer data (base=5000, remote=2, etc.)
- [x] Unique test scenarios (different gaps, different weight distributions)

---

## Testing Notes for Coder

1. **Import calc.ts functions**: `buildScoreResult` must import and use `calcMonthlyNet` from `@/lib/calc`
   - Do NOT modify calc.ts — only import from it
   - Money axis raw value = `calcMonthlyNet(target) - calcMonthlyNet(current)` (in Won)

2. **Negotiation template separation**:
   - Put negotiation point templates in `src/lib/negotiation.ts`
   - Keep `buildScoreResult` in `src/lib/score.ts`
   - score.ts imports from negotiation.ts to generate points

3. **Weighted scores**:
   - `weightedCurrent = normCurrent * (weight / sumWeights)`
   - `weightedTarget = normTarget * (weight / sumWeights)`
   - When `sumWeights === 0`, use `DEFAULT_WEIGHTS` before calculating

4. **Gap & Verdict**:
   - `gap = totalTarget - totalCurrent` (rounded to 1 decimal)
   - Verdict determined by gap thresholds (see AC-3)

5. **Money breakdown**:
   - Use `calcMonthlyNet()` to get monthly net for both current & target
   - `diffMonthlyWon = targetMonthlyNetWon - currentMonthlyNetWon`
   - `diffYearlyWon = diffMonthlyWon * 12`
   - Tax fields: compute using `getEffectiveTaxRate()` from calc.ts

---

## Running Tests

```bash
# Run just packet-0004 tests
npx vitest run src/__tests__/packet-0004.test.ts

# Run all tests
npm test
```

After implementation, all 25 tests should pass GREEN.

---

## Related Packets
- **Packet 0001**: Basic offer CRUD (seed data)
- **Packet 0002**: Weight management (user preferences)
- **Packet 0003**: Validation + monthly net calculation (used by this packet)
- **Packet 0004** (this one): Scoring, normalization, verdict, negotiation (core comparison logic)
