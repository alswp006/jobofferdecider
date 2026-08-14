import { describe, it, expect } from "vitest";
import { getTaxRate, calcMoney } from "@/lib/calc";
import type { CompanyProfile, MoneyBreakdown } from "@/lib/types";

describe("금전 실질가치 계산 (calcMoney)", () => {
  // Helper to create a minimal valid CompanyProfile for testing
  const createProfile = (overrides?: Partial<CompanyProfile>): CompanyProfile => ({
    id: "test-1",
    name: "Test Company",
    baseSalary: 60000000,
    bonusPerYear: 6000000,
    remoteDaysPerWeek: 2,
    commuteMinutesOneWay: 40,
    commuteCostPerDay: 3000,
    lunchCostPerDay: 9000,
    mealSupportPerMonth: 100000,
    welfarePointsPerYear: 1200000,
    ratings: {
      growth: 3,
      workLife: 3,
      stability: 3,
      culture: 3,
      commuteEase: 3,
    },
    updatedAt: "2026-08-15T00:00:00Z",
    ...overrides,
  });

  describe("AC-1: 입력값으로 호출 시 9개 필드 일치", () => {
    it("should calculate all 9 fields correctly with specified profile", () => {
      // Profile that produces expected AC-1 values:
      // officeDaysPerMonth=12 (remoteDaysPerWeek=2 → (5-2)*4=12)
      // baseSalary+bonusPerYear=66M, rate=0.21, monthlyBenefit=200K
      const profile = createProfile({
        baseSalary: 60000000,
        bonusPerYear: 6000000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 40,
        commuteCostPerDay: 3000,
        lunchCostPerDay: 9000,
        mealSupportPerMonth: 100000,
        welfarePointsPerYear: 1200000,
      });

      const result = calcMoney(profile);

      // All 9 fields from AC-1
      expect(result.officeDaysPerMonth).toBe(12);
      expect(result.grossAnnual).toBe(66000000);
      expect(result.effectiveTaxRate).toBe(0.21);
      expect(result.netMonthlySalary).toBe(4345000);
      expect(result.monthlyBenefit).toBe(200000);
      expect(result.monthlyCommuteCost).toBe(36000);
      expect(result.monthlyLunchCost).toBe(108000);
      expect(result.monthlyCommuteTimeCost).toBe(240000);
      expect(result.netMonthlyValue).toBe(4161000);
    });

    it("should calculate netMonthlyValue using correct formula", () => {
      const profile = createProfile({
        baseSalary: 60000000,
        bonusPerYear: 6000000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 40,
        commuteCostPerDay: 3000,
        lunchCostPerDay: 9000,
        mealSupportPerMonth: 100000,
        welfarePointsPerYear: 1200000,
      });

      const result = calcMoney(profile);

      // netMonthlyValue = netMonthlySalary + monthlyBenefit − monthlyCommuteCost − monthlyLunchCost − monthlyCommuteTimeCost
      const expected = 4345000 + 200000 - 36000 - 108000 - 240000;
      expect(result.netMonthlyValue).toBe(expected);
      expect(result.netMonthlyValue).toBe(4161000);
    });
  });

  describe("AC-2: getTaxRate 세율 구간별 정확도", () => {
    it("should return 0.09 tax rate for income ≤ 24,000,000", () => {
      expect(getTaxRate(24000000)).toBe(0.09);
    });

    it("should return 0.13 tax rate for income 24,000,001", () => {
      expect(getTaxRate(24000001)).toBe(0.13);
    });

    it("should return 0.31 tax rate for very high income", () => {
      expect(getTaxRate(999999999)).toBe(0.31);
    });

    it("should return correct rate for low income", () => {
      expect(getTaxRate(10000000)).toBe(0.09);
    });

    it("should return correct rate for mid-high income", () => {
      expect(getTaxRate(50000000)).toBeGreaterThan(0.09);
    });
  });

  describe("AC-3: 완전 원격근무 (remoteDaysPerWeek=5)", () => {
    it("should have 0 office days when fully remote", () => {
      const profile = createProfile({
        remoteDaysPerWeek: 5,
      });

      const result = calcMoney(profile);

      expect(result.officeDaysPerMonth).toBe(0);
    });

    it("should have 0 commute cost when fully remote", () => {
      const profile = createProfile({
        remoteDaysPerWeek: 5,
      });

      const result = calcMoney(profile);

      expect(result.monthlyCommuteCost).toBe(0);
    });

    it("should have 0 lunch cost when fully remote", () => {
      const profile = createProfile({
        remoteDaysPerWeek: 5,
      });

      const result = calcMoney(profile);

      expect(result.monthlyLunchCost).toBe(0);
    });

    it("should have 0 commute time cost when fully remote", () => {
      const profile = createProfile({
        remoteDaysPerWeek: 5,
      });

      const result = calcMoney(profile);

      expect(result.monthlyCommuteTimeCost).toBe(0);
    });

    it("should have higher netMonthlyValue when all office costs are 0", () => {
      const officeProfile = createProfile({
        remoteDaysPerWeek: 0,
      });

      const remoteProfile = createProfile({
        remoteDaysPerWeek: 5,
      });

      const officeResult = calcMoney(officeProfile);
      const remoteResult = calcMoney(remoteProfile);

      // Remote should have higher net value due to no office costs
      expect(remoteResult.netMonthlyValue).toBeGreaterThan(officeResult.netMonthlyValue);
    });
  });

  describe("AC-4: 모든 필드 정수화 (effectiveTaxRate 제외)", () => {
    it("should have all integer values except effectiveTaxRate", () => {
      const profile = createProfile({
        remoteDaysPerWeek: 0,
      });

      const result = calcMoney(profile);

      // Check all except effectiveTaxRate are integers
      expect(Number.isInteger(result.officeDaysPerMonth)).toBe(true);
      expect(Number.isInteger(result.grossAnnual)).toBe(true);
      expect(Number.isInteger(result.netMonthlySalary)).toBe(true);
      expect(Number.isInteger(result.monthlyBenefit)).toBe(true);
      expect(Number.isInteger(result.monthlyCommuteCost)).toBe(true);
      expect(Number.isInteger(result.monthlyLunchCost)).toBe(true);
      expect(Number.isInteger(result.monthlyCommuteTimeCost)).toBe(true);
      expect(Number.isInteger(result.netMonthlyValue)).toBe(true);
    });

    it("should allow effectiveTaxRate to be decimal", () => {
      const profile = createProfile({
        remoteDaysPerWeek: 0,
      });

      const result = calcMoney(profile);

      // effectiveTaxRate can be decimal like 0.21
      expect(typeof result.effectiveTaxRate).toBe("number");
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(1);
    });

    it("should round all calculated costs to nearest integer", () => {
      const profile = createProfile({
        baseSalary: 55555555,
        bonusPerYear: 10000000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 37,
        commuteCostPerDay: 3333,
        lunchCostPerDay: 9876,
        mealSupportPerMonth: 105000,
        welfarePointsPerYear: 1200000,
      });

      const result = calcMoney(profile);

      // All numeric outputs should be integers
      [
        result.officeDaysPerMonth,
        result.grossAnnual,
        result.netMonthlySalary,
        result.monthlyBenefit,
        result.monthlyCommuteCost,
        result.monthlyLunchCost,
        result.monthlyCommuteTimeCost,
        result.netMonthlyValue,
      ].forEach((value) => {
        expect(Number.isInteger(value)).toBe(true);
      });
    });
  });

  describe("Edge cases and additional validation", () => {
    it("should handle minimum salary", () => {
      const profile = createProfile({
        baseSalary: 10000000,
        bonusPerYear: 0,
        remoteDaysPerWeek: 0,
        commuteMinutesOneWay: 0,
        commuteCostPerDay: 0,
        lunchCostPerDay: 0,
        mealSupportPerMonth: 0,
        welfarePointsPerYear: 0,
      });

      const result = calcMoney(profile);

      expect(result.grossAnnual).toBe(10000000); // 10M base + 0 bonus
      expect(result.netMonthlySalary).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBe(getTaxRate(10000000));
    });

    it("should handle partial remote work", () => {
      const profile = createProfile({
        baseSalary: 55000000,
        bonusPerYear: 5000000,
        remoteDaysPerWeek: 2,
        commuteMinutesOneWay: 30,
        commuteCostPerDay: 2500,
        lunchCostPerDay: 8000,
        mealSupportPerMonth: 50000,
        welfarePointsPerYear: 1200000,
      });

      const result = calcMoney(profile);

      // Should have office days > 0 but < full office days
      expect(result.officeDaysPerMonth).toBeGreaterThan(0);
      expect(result.monthlyCommuteCost).toBeGreaterThan(0);
      expect(result.monthlyLunchCost).toBeGreaterThan(0);
      expect(result.monthlyCommuteTimeCost).toBeGreaterThan(0);
    });
  });
});
