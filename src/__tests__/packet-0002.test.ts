import { describe, it, expect } from "vitest";
import {
  TAX_TABLE,
  TIME_VALUE_PER_HOUR,
  MAX_OFFERS,
  STORAGE_KEY,
  ONBOARDED_KEY,
  INITIAL_STATE,
  SCORE_LABELS,
  VERDICT_LABELS,
} from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/types";

describe("packet-0002: 상수 테이블 정의", () => {
  describe("AC-1: TAX_TABLE 구조 및 값", () => {
    it("should have exactly 6 elements", () => {
      expect(TAX_TABLE).toHaveLength(6);
    });

    it("should have first element with upTo=24_000_000 and rate=0.09", () => {
      expect(TAX_TABLE[0]).toEqual({
        upTo: 24_000_000,
        rate: 0.09,
      });
    });

    it("should have last element with upTo=Infinity and rate=0.31", () => {
      expect(TAX_TABLE[TAX_TABLE.length - 1]).toEqual({
        upTo: Infinity,
        rate: 0.31,
      });
    });

    it("should have all elements in ascending order of upTo", () => {
      for (let i = 0; i < TAX_TABLE.length - 1; i++) {
        expect(TAX_TABLE[i].upTo).toBeLessThan(TAX_TABLE[i + 1].upTo);
      }
    });

    it("should have all rates between 0 and 1", () => {
      TAX_TABLE.forEach((entry) => {
        expect(entry.rate).toBeGreaterThanOrEqual(0);
        expect(entry.rate).toBeLessThanOrEqual(1);
      });
    });
  });

  describe("AC-2: INITIAL_STATE 기본값", () => {
    it("should have version=1", () => {
      expect(INITIAL_STATE.version).toBe(1);
    });

    it("should have current=null", () => {
      expect(INITIAL_STATE.current).toBeNull();
    });

    it("should have empty offers array", () => {
      expect(INITIAL_STATE.offers).toEqual([]);
    });

    it("should have DEFAULT_WEIGHTS", () => {
      expect(INITIAL_STATE.weights).toEqual(DEFAULT_WEIGHTS);
    });

    it("should have empty unlockedOfferIds array", () => {
      expect(INITIAL_STATE.unlockedOfferIds).toEqual([]);
    });

    it("should be deeply equal to expected structure", () => {
      expect(INITIAL_STATE).toEqual({
        version: 1,
        current: null,
        offers: [],
        weights: DEFAULT_WEIGHTS,
        unlockedOfferIds: [],
      });
    });
  });

  describe("AC-3: SCORE_LABELS 6개 키와 값", () => {
    it("should have exactly 6 keys", () => {
      expect(Object.keys(SCORE_LABELS)).toHaveLength(6);
    });

    it("should have money label '연봉 실질가치'", () => {
      expect(SCORE_LABELS.money).toBe("연봉 실질가치");
    });

    it("should have growth label '성장성'", () => {
      expect(SCORE_LABELS.growth).toBe("성장성");
    });

    it("should have workLife label '워라밸'", () => {
      expect(SCORE_LABELS.workLife).toBe("워라밸");
    });

    it("should have stability label '안정성'", () => {
      expect(SCORE_LABELS.stability).toBe("안정성");
    });

    it("should have culture label '조직문화'", () => {
      expect(SCORE_LABELS.culture).toBe("조직문화");
    });

    it("should have commuteEase label '통근 편의'", () => {
      expect(SCORE_LABELS.commuteEase).toBe("통근 편의");
    });

    it("should have all 6 expected keys in correct order", () => {
      expect(Object.keys(SCORE_LABELS)).toEqual([
        "money",
        "growth",
        "workLife",
        "stability",
        "culture",
        "commuteEase",
      ]);
    });
  });

  describe("AC-4: VERDICT_LABELS 4개 값", () => {
    it("should have exactly 4 entries", () => {
      expect(Object.keys(VERDICT_LABELS)).toHaveLength(4);
    });

    it("should have MOVE label '이직 추천'", () => {
      expect(VERDICT_LABELS.MOVE).toBe("이직 추천");
    });

    it("should have CONDITIONAL label '조건부 추천'", () => {
      expect(VERDICT_LABELS.CONDITIONAL).toBe("조건부 추천");
    });

    it("should have HOLD label '판단 보류'", () => {
      expect(VERDICT_LABELS.HOLD).toBe("판단 보류");
    });

    it("should have STAY label '잔류 추천'", () => {
      expect(VERDICT_LABELS.STAY).toBe("잔류 추천");
    });

    it("should have all 4 expected keys", () => {
      expect(Object.keys(VERDICT_LABELS)).toEqual([
        "MOVE",
        "CONDITIONAL",
        "HOLD",
        "STAY",
      ]);
    });
  });

  describe("AC-5: 스칼라 상수 값", () => {
    it("should have MAX_OFFERS=3", () => {
      expect(MAX_OFFERS).toBe(3);
    });

    it("should have TIME_VALUE_PER_HOUR=15000", () => {
      expect(TIME_VALUE_PER_HOUR).toBe(15_000);
    });

    it("should have STORAGE_KEY='jod:state:v1'", () => {
      expect(STORAGE_KEY).toBe("jod:state:v1");
    });

    it("should have ONBOARDED_KEY='jod:onboarded:v1'", () => {
      expect(ONBOARDED_KEY).toBe("jod:onboarded:v1");
    });
  });
});
