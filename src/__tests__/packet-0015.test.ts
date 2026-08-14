/**
 * TDD Red Phase — Tests for packet 0015 (오퍼 비교 페이지, S5)
 * These tests define the expected behavior. Implementation (src/pages/Compare.tsx) follows.
 *
 * Acceptance Criteria:
 * 1. current가 null이거나 offers가 0개면 EmptyState와 입력 화면 이동 버튼이 보인다
 * 2. 오퍼 N개(1~3)일 때 비교 행이 현재 직장 1행 + 오퍼 N행 = N+1행으로 렌더된다
 * 3. 각 행에 월 실질가치(3자리 콤마)와 총점(0~100 정수), 오퍼 행에는 verdictLabel Chip이 표시된다
 * 4. 오퍼 중 offerTotal 최고 행에 '추천' Badge가 정확히 1개만 표시된다
 * 5. 행 탭 시 해당 오퍼의 /result/:id로 이동한다(현재 직장 행 제외)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEY } from "@/lib/constants";
import type { AppState, CompanyProfile } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { calcMoney } from "@/lib/calc";
import { calcScore } from "@/lib/score";
import { getVerdict } from "@/lib/verdict";
import { formatNumber } from "@/lib/utils";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Compare from "@/pages/Compare";

function makeProfile(overrides?: Partial<CompanyProfile>): CompanyProfile {
  return {
    id: "test-" + Math.random(),
    name: "테스트 회사",
    baseSalary: 50_000_000,
    bonusPerYear: 0,
    remoteDaysPerWeek: 0,
    commuteMinutesOneWay: 0,
    commuteCostPerDay: 0,
    lunchCostPerDay: 0,
    mealSupportPerMonth: 0,
    welfarePointsPerYear: 0,
    ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function seedState(overrides: Partial<AppState> = {}): AppState {
  const state: AppState = {
    version: 1,
    current: null,
    offers: [],
    weights: DEFAULT_WEIGHTS,
    unlockedOfferIds: [],
    ...overrides,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function renderCompare() {
  return render(React.createElement(MemoryRouter, { initialEntries: ["/compare"] }, React.createElement(Compare)));
}

const CURRENT = makeProfile({ id: "current", name: "현재회사", baseSalary: 55_000_000 });
// 우세 오퍼: 낮은 점수
const OFFER_LOW = makeProfile({
  id: "offer-low",
  name: "로우컴퍼니",
  baseSalary: 50_000_000,
  ratings: { growth: 2, workLife: 2, stability: 2, culture: 2, commuteEase: 2 },
});
// 중간 점수
const OFFER_MID = makeProfile({
  id: "offer-mid",
  name: "미드컴퍼니",
  baseSalary: 60_000_000,
  ratings: { growth: 3, workLife: 3, stability: 3, culture: 3, commuteEase: 3 },
});
// 최고 점수
const OFFER_HIGH = makeProfile({
  id: "offer-high",
  name: "하이컴퍼니",
  baseSalary: 90_000_000,
  ratings: { growth: 5, workLife: 5, stability: 5, culture: 5, commuteEase: 5 },
});

describe("오퍼 비교 페이지 (S5)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  describe("AC-1[P0]: current 없음/offers 0개 → EmptyState", () => {
    it("shows EmptyState with a navigation button when current is null", () => {
      seedState({ current: null, offers: [] });
      renderCompare();

      expect(screen.getByTestId("compare-empty")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /현재 직장|입력/ })).toBeInTheDocument();
    });

    it("shows EmptyState with a navigation button when offers is empty", () => {
      seedState({ current: CURRENT, offers: [] });
      renderCompare();

      expect(screen.getByTestId("compare-empty")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /오퍼|입력/ })).toBeInTheDocument();
    });
  });

  describe("AC-2: 비교 행 개수 = 현재 직장 1 + 오퍼 N", () => {
    it("renders 2 rows (current + 1 offer) when there is 1 offer", () => {
      seedState({ current: CURRENT, offers: [OFFER_MID] });
      renderCompare();

      expect(screen.getAllByTestId("compare-row")).toHaveLength(2);
    });

    it("renders 4 rows (current + 3 offers) when there are 3 offers", () => {
      seedState({ current: CURRENT, offers: [OFFER_LOW, OFFER_MID, OFFER_HIGH] });
      renderCompare();

      expect(screen.getAllByTestId("compare-row")).toHaveLength(4);
    });
  });

  describe("AC-3[P0]: 각 행에 월 실질가치(콤마)와 총점, 오퍼 행에는 verdictLabel", () => {
    it("shows formatted net monthly value and integer total score for the current row", () => {
      seedState({ current: CURRENT, offers: [OFFER_MID] });
      renderCompare();

      const currentMoney = calcMoney(CURRENT);
      const score = getVerdict(calcScore(CURRENT, OFFER_MID, DEFAULT_WEIGHTS)!);

      const currentRow = screen.getAllByTestId("compare-row")[0];
      expect(currentRow.textContent).toContain(formatNumber(currentMoney.netMonthlyValue));
      expect(currentRow.textContent).toContain(String(score.currentTotal));
    });

    it("shows verdictLabel chip, net monthly value, and total score for an offer row", () => {
      seedState({ current: CURRENT, offers: [OFFER_MID] });
      renderCompare();

      const score = getVerdict(calcScore(CURRENT, OFFER_MID, DEFAULT_WEIGHTS)!);
      const offerMoney = calcMoney(OFFER_MID);

      const offerRow = screen.getAllByTestId("compare-row")[1];
      expect(offerRow.textContent).toContain(score.verdictLabel);
      expect(offerRow.textContent).toContain(formatNumber(offerMoney.netMonthlyValue));
      expect(offerRow.textContent).toContain(String(score.offerTotal));
    });
  });

  describe("AC-4[P0]: 최고 offerTotal 오퍼 행에만 '추천' Badge", () => {
    it("shows exactly one '추천' badge on the offer row with the highest offerTotal", () => {
      seedState({ current: CURRENT, offers: [OFFER_LOW, OFFER_MID, OFFER_HIGH] });
      renderCompare();

      const scores = [OFFER_LOW, OFFER_MID, OFFER_HIGH].map(
        (offer) => getVerdict(calcScore(CURRENT, offer, DEFAULT_WEIGHTS)!),
      );
      const best = scores.reduce((a, b) => (b.offerTotal > a.offerTotal ? b : a));

      const badges = screen.getAllByText("추천");
      expect(badges).toHaveLength(1);

      const bestRow = screen.getByTestId(`compare-row-${best.offerId}`);
      expect(bestRow.textContent).toContain("추천");
    });
  });

  describe("AC-5: 오퍼 행 탭 시 /result/:id로 이동 (현재 직장 행 제외)", () => {
    it("navigates to /result/:offerId when an offer row is clicked", () => {
      seedState({ current: CURRENT, offers: [OFFER_MID] });
      renderCompare();

      fireEvent.click(screen.getByTestId(`compare-row-${OFFER_MID.id}`));

      expect(mockNavigate).toHaveBeenCalledWith(`/result/${OFFER_MID.id}`);
    });

    it("does not navigate when the current-company row is clicked", () => {
      seedState({ current: CURRENT, offers: [OFFER_MID] });
      renderCompare();

      const currentRow = screen.getAllByTestId("compare-row")[0];
      fireEvent.click(currentRow);

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
