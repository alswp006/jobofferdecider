# Packet 0006: Ready for Implementation — 판정 & 협상 포인트 (getVerdict)

## TDD Red Phase Complete ✓

**Test file:** `src/__tests__/packet-0006.test.ts` — 25 focused tests, all ready and failing as expected

## What the Coder Must Implement

Create `src/lib/verdict.ts` with three pure functions:

### 1. `getVerdictLevel(diff: number): VerdictLevel`
Maps score difference to verdict level:
- `diff >= 10` → `"MOVE"`
- `3 <= diff < 10` → `"CONDITIONAL"`  
- `-3 <= diff < 3` → `"HOLD"`
- `diff < -3` → `"STAY"`

### 2. `buildNegotiationPoints(items: ScoreItem[]): string[]`
- Filter disadvantages (offerScore < currentScore)
- Sort by gap descending (largest disadvantages first)
- Return top 3
- Fill with fixed templates if < 3 real disadvantages
- Always return exactly 3 strings (1-60 chars each, no dups)

### 3. `getVerdict(result: ScoreResult): ScoreResult`
- Call `getVerdictLevel(result.diff)` → populate `verdict`
- Map verdict to label → populate `verdictLabel`
  - "MOVE" → "이직 추천"
  - Others as appropriate
- Call `buildNegotiationPoints()` → populate `negotiationPoints`
- Return updated result

## Acceptance Criteria (25 tests)

- **AC-1:** 6 boundary value tests (10, 9, 3, 2, -3, -4)
- **AC-2:** Verdict result structure & labels (4 tests)
- **AC-3:** negotiationPoints constraints (3 tests: length=3, 1-60 chars, no dups)
- **AC-4:** Disadvantage selection & sorting (5 tests)
- **AC-5:** No external APIs (fetch/openai/anthropic = 0)

## Critical Rules

1. **Pure functions only** — no I/O, no async, no external APIs
2. **negotiationPoints.length === 3 always**
3. **Sorted by score diff descending** (biggest disadvantages first)
4. **No fetch/openai/anthropic in source**

## Run Tests

```bash
npx vitest run src/__tests__/packet-0006.test.ts
```

All 25 tests must pass. Type checking must pass (`npx tsc --noEmit`).

## Test Structure Example

Each test follows pattern:
```typescript
it("AC-X: description", async () => {
  const { functionName } = await import("@/lib/verdict");
  const result = functionName(input);
  expect(result).toBe(expected);
});
```

Tests are self-contained with helper `makeScoreResult()` and `makeProfile()` functions.
