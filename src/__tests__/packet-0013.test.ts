/**
 * TDD Red Phase — Tests for packet 0013 (결과 화면 — 공개 영역 & SummaryHero, S4 전반부)
 * These tests define the expected behavior. Implementation (src/pages/Result.tsx) follows.
 *
 * Acceptance Criteria:
 * 1. 존재하지 않는 offerId로 진입 → data-testid="not-found" EmptyState '오퍼를 찾을 수 없어요' + '홈으로' 버튼 → navigate('/', { replace: true })
 * 2. current가 null → '현재 직장을 먼저 입력해주세요' 안내 + '현재 직장 입력하기' 버튼 → navigate('/company/current')
 * 3. 정상 진입 시 verdictLabel 배지, currentTotal/offerTotal 점수, 월 실질가치 차액이 3자리 콤마로 표시된다
 * 4. '세율은 구간별 근사치예요. 규칙 기반 계산 결과이며 재무·커리어 자문이 아니에요' 고지 문구가 렌더된다
 * 5. 결과 카드 아래 AdSlot 배너가 정확히 1개 렌더되고 고지 문구보다 DOM상 뒤에 위치한다(콘텐츠와 겹치지 않음)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEY } from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { AppState, CompanyProfile } from "@/lib/types";
import { calcMoney } from "@/lib/calc";
import { calcScore } from "@/lib/score";
import { getVerdict } from "@/lib/verdict";
import { formatNumber } from "@/lib/utils";

mockTds();
mockAppsInToss();

// react-router-dom: keep real useParams (Result reads offerId from the URL),
// only override useNavigate so we can assert on it.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Result from "@/pages/Result";

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

function renderAt(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/result/:offerId", element: React.createElement(Result) }),
      ),
    ),
  );
}

const CURRENT = makeProfile({ id: "current", name: "현재회사", baseSalary: 60_000_000 });
// offer 우세: 월 실질가치가 CURRENT보다 크다
const OFFER_BETTER = makeProfile({ id: "offer-1", name: "네이버", baseSalary: 70_000_000 });
// offer 열세: 월 실질가치가 CURRENT보다 작다
const OFFER_WORSE = makeProfile({ id: "offer-2", name: "스타트업", baseSalary: 50_000_000 });

describe("결과 화면 — 공개 영역 & SummaryHero (S4 전반부)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  describe("AC-1[P0]: 존재하지 않는 offerId", () => {
    it("shows the not-found empty state and navigates home (replace) on tap", () => {
      seedState({ current: CURRENT, offers: [OFFER_BETTER] });

      renderAt("/result/offer-does-not-exist");

      const notFound = screen.getByTestId("not-found");
      expect(notFound).toBeInTheDocument();
      expect(screen.getByText("오퍼를 찾을 수 없어요")).toBeInTheDocument();

      const homeButton = screen.getByRole("button", { name: "홈으로" });
      fireEvent.click(homeButton);

      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  describe("AC-2[P0]: current가 null", () => {
    it("shows guidance to enter current company first and navigates to the input screen on tap", () => {
      seedState({ current: null, offers: [OFFER_BETTER] });

      renderAt("/result/offer-1");

      expect(screen.getByText("현재 직장을 먼저 입력해주세요")).toBeInTheDocument();

      const enterButton = screen.getByRole("button", { name: "현재 직장 입력하기" });
      fireEvent.click(enterButton);

      expect(mockNavigate).toHaveBeenCalledWith("/company/current");
    });
  });

  describe("AC-3[P0]: 정상 진입 — 판정 배지·총점·월 실질가치 차액", () => {
    it("renders the verdict badge, currentTotal/offerTotal scores, and a positive net-value diff with comma formatting", () => {
      seedState({ current: CURRENT, offers: [OFFER_BETTER] });
      const score = getVerdict(calcScore(CURRENT, OFFER_BETTER, DEFAULT_WEIGHTS)!);
      expect(score.currentTotal).toBe(58);
      expect(score.offerTotal).toBe(64);
      expect(score.verdictLabel).toBe("조건부 추천");

      const currentValue = calcMoney(CURRENT).netMonthlyValue;
      const offerValue = calcMoney(OFFER_BETTER).netMonthlyValue;
      const diff = offerValue - currentValue;
      expect(diff).toBe(658_333);

      renderAt("/result/offer-1");

      expect(screen.getByText(score.verdictLabel)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${score.currentTotal}점`))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${score.offerTotal}점`))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(`${formatNumber(diff)}원`))).toBeInTheDocument();
    });

    it("renders a negative net-value diff with a leading minus sign and comma formatting", () => {
      seedState({ current: CURRENT, offers: [OFFER_WORSE] });
      const currentValue = calcMoney(CURRENT).netMonthlyValue;
      const offerValue = calcMoney(OFFER_WORSE).netMonthlyValue;
      const diff = offerValue - currentValue;
      expect(diff).toBe(-491_667);
      expect(formatNumber(diff)).toBe("-491,667");

      renderAt("/result/offer-2");

      expect(screen.getByText(new RegExp(`${formatNumber(diff)}원`))).toBeInTheDocument();
    });
  });

  describe("AC-4[P1]: 규칙 기반 고지 문구", () => {
    it("renders the tax-approximation and non-advisory disclosure copy", () => {
      seedState({ current: CURRENT, offers: [OFFER_BETTER] });

      renderAt("/result/offer-1");

      expect(document.body.textContent).toContain("세율은 구간별 근사치예요");
      expect(document.body.textContent).toContain(
        "규칙 기반 계산 결과이며 재무·커리어 자문이 아니에요",
      );
    });
  });

  describe("AC-5[P1]: AdSlot 배너", () => {
    it("renders exactly one AdSlot banner positioned after the disclosure copy", () => {
      seedState({ current: CURRENT, offers: [OFFER_BETTER] });

      renderAt("/result/offer-1");

      const adSlots = document.querySelectorAll("[data-ad-group-id]");
      expect(adSlots).toHaveLength(1);

      const notice = screen.getByText(/규칙 기반 계산 결과이며 재무·커리어 자문이 아니에요/);
      const position = notice.compareDocumentPosition(adSlots[0]);
      expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });
});
