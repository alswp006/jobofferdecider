/**
 * TDD Red Phase — Tests for packet 0012 (홈 페이지 S1)
 * These tests define the expected behavior. Implementation (src/pages/Home.tsx) follows.
 *
 * Acceptance Criteria:
 * 1. current === null → EmptyState '현재 직장부터 입력해요' + '현재 직장 입력하기' → navigate('/company/current')
 * 2. current 있음 → SummaryHero에 calcMoney(current).netMonthlyValue 3자리 콤마 + '원'
 * 3. offers 0개 → EmptyState '아직 오퍼가 없어요' / 1개 이상 → ListRow에 회사명·월 실질가치·verdictLabel
 * 4. '받은 오퍼 N/3' 문구의 N === offers.length, 3개일 때 추가 시도 → AlertDialog 차단
 * 5. 오퍼 ListRow 탭 → navigate('/result/:id'), 목록 아래 AdSlot 배너 1개
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEY, MAX_OFFERS } from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { AppState, CompanyProfile } from "@/lib/types";
import { calcMoney } from "@/lib/calc";
import { calcScore } from "@/lib/score";
import { getVerdict } from "@/lib/verdict";

mockTds();
mockAppsInToss();
mockRouter();

import Home from "@/pages/Home";

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

function renderHome() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(Home)),
  );
}

const CURRENT = makeProfile({ id: "current", name: "현재회사", baseSalary: 60_000_000 });
const OFFER_A = makeProfile({ id: "offer-1", name: "네이버", baseSalary: 70_000_000 });

describe("홈 페이지 (S1)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  describe("AC-1: current가 null이면 EmptyState + 입력 버튼", () => {
    it("shows the empty-current state and navigates to /company/current on tap", () => {
      seedState({ current: null, offers: [] });

      renderHome();

      expect(screen.getByText("현재 직장부터 입력해요")).toBeInTheDocument();
      const enterButton = screen.getByRole("button", { name: "현재 직장 입력하기" });

      fireEvent.click(enterButton);

      expect(mockNavigate).toHaveBeenCalledWith("/company/current");
    });
  });

  describe("AC-2: current가 있으면 SummaryHero에 월 실질가치가 콤마 포맷으로 표시된다", () => {
    it("renders calcMoney(current).netMonthlyValue with comma separators and '원' suffix", () => {
      seedState({ current: CURRENT, offers: [] });
      const expectedValue = calcMoney(CURRENT).netMonthlyValue;
      expect(expectedValue).toBe(3_950_000);

      renderHome();

      expect(screen.getByText("3,950,000원")).toBeInTheDocument();
    });
  });

  describe("AC-3: 오퍼 목록 — 빈 상태와 채워진 상태", () => {
    it("shows the empty-offers state when there are no offers", () => {
      seedState({ current: CURRENT, offers: [] });

      renderHome();

      expect(screen.getByText("아직 오퍼가 없어요")).toBeInTheDocument();
    });

    it("renders company name, formatted monthly value, and verdictLabel for each offer", () => {
      seedState({ current: CURRENT, offers: [OFFER_A] });
      const offerMoneyValue = calcMoney(OFFER_A).netMonthlyValue;
      expect(offerMoneyValue).toBe(4_608_333);
      const verdictLabel = getVerdict(calcScore(CURRENT, OFFER_A, DEFAULT_WEIGHTS)!).verdictLabel;

      renderHome();

      expect(screen.getByText("네이버")).toBeInTheDocument();
      expect(screen.getByText("4,608,333원")).toBeInTheDocument();
      expect(screen.getByText(verdictLabel)).toBeInTheDocument();
    });
  });

  describe("AC-4: '받은 오퍼 N/3' 문구 + 3개일 때 AlertDialog 차단", () => {
    it("shows '받은 오퍼 2/3' when there are 2 offers", () => {
      const offerB = makeProfile({ id: "offer-2", name: "카카오", baseSalary: 55_000_000 });
      seedState({ current: CURRENT, offers: [OFFER_A, offerB] });

      renderHome();

      expect(screen.getByText("받은 오퍼 2/3")).toBeInTheDocument();
    });

    it("blocks adding a 4th offer with an AlertDialog when offers.length === MAX_OFFERS", () => {
      expect(MAX_OFFERS).toBe(3);
      const offerB = makeProfile({ id: "offer-2", name: "카카오", baseSalary: 55_000_000 });
      const offerC = makeProfile({ id: "offer-3", name: "라인", baseSalary: 65_000_000 });
      seedState({ current: CURRENT, offers: [OFFER_A, offerB, offerC] });

      renderHome();

      expect(screen.getByText("받은 오퍼 3/3")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "오퍼 추가하기" }));

      expect(
        screen.getByRole("alertdialog", { name: "오퍼는 3개까지 담을 수 있어요" }),
      ).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalledWith("/company/offer/new");
    });
  });

  describe("AC-5: 오퍼 탭 시 결과 화면 이동 + AdSlot 배너", () => {
    it("navigates to /result/:id on offer tap and renders exactly one AdSlot banner below the list", () => {
      seedState({ current: CURRENT, offers: [OFFER_A] });

      renderHome();

      fireEvent.click(screen.getByRole("listitem"));

      expect(mockNavigate).toHaveBeenCalledWith("/result/offer-1");

      const adSlots = document.querySelectorAll("[data-ad-group-id]");
      expect(adSlots).toHaveLength(1);
    });
  });
});
