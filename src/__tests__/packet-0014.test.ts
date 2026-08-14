/**
 * TDD Red Phase — Tests for packet 0014 (결과 화면 — 리워드 게이트 & 분석표, S4 후반부)
 * These tests define the expected behavior. Implementation
 * (src/components/ResultAnalysis.tsx, src/pages/Result.tsx) follows.
 *
 * Acceptance Criteria:
 * 1. 미해금 오퍼 → 분석표 대신 '광고를 보면 상세 분석표를 볼 수 있어요' 잠금 카드 + TossRewardAd 트리거
 * 2. 광고 시청 완료 후 분석표가 즉시 노출되고 unlockedOfferIds에 offerId가 추가된다
 * 3. 재진입(새로고침) 시 해금된 오퍼는 광고 없이 분석표가 바로 보인다
 * 4. 분석표가 6행이며 각 행에 항목명, 현재 점수, 오퍼 점수, 가중치 비율(%)이 표시된다
 * 5. 협상 포인트가 정확히 3개 ListRow로 렌더된다
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEY } from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { AppState, CompanyProfile, ScoreResult } from "@/lib/types";
import { calcScore } from "@/lib/score";
import { getVerdict } from "@/lib/verdict";

mockTds();
mockAppsInToss();

// react-router-dom: keep real useParams (Result reads offerId from the URL),
// only override useNavigate so we can assert on it.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import { ResultAnalysis } from "@/components/ResultAnalysis";
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
// offer 우세: negotiationPoints는 열세 항목이 없어 FIXED_NEGOTIATION_TEMPLATES로 채워진다 (결정론적)
const OFFER_BETTER = makeProfile({ id: "offer-1", name: "네이버", baseSalary: 70_000_000 });

const SCORE: ScoreResult = getVerdict(calcScore(CURRENT, OFFER_BETTER, DEFAULT_WEIGHTS)!);

describe("결과 화면 — 리워드 게이트 & 분석표 (S4 후반부)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  describe("AC-1[P0]: 미해금 오퍼 — 잠금 카드 + 광고 트리거", () => {
    it("shows the lock copy and an ad trigger, without revealing the analysis table or negotiation points", () => {
      const onUnlock = vi.fn();
      render(
        React.createElement(ResultAnalysis, {
          offerId: OFFER_BETTER.id,
          score: SCORE,
          unlocked: false,
          onUnlock,
        }),
      );

      expect(screen.getByText("광고를 보면 상세 분석표를 볼 수 있어요")).toBeInTheDocument();
      expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
      expect(screen.queryAllByTestId("analysis-row")).toHaveLength(0);
      expect(screen.queryAllByTestId("negotiation-point")).toHaveLength(0);
    });
  });

  describe("AC-2[P0]: 광고 시청 완료 — 즉시 노출 + 콜백 호출", () => {
    it("reveals the analysis table immediately after the ad finishes and calls onUnlock exactly once", async () => {
      const onUnlock = vi.fn();
      render(
        React.createElement(ResultAnalysis, {
          offerId: OFFER_BETTER.id,
          score: SCORE,
          unlocked: false,
          onUnlock,
        }),
      );

      const button = await screen.findByRole("button");
      await waitFor(() => expect(button).not.toBeDisabled());
      fireEvent.click(button);

      await waitFor(() => expect(onUnlock).toHaveBeenCalledTimes(1));
      expect(screen.getAllByTestId("analysis-row")).toHaveLength(6);
      expect(screen.queryByText("광고를 보면 상세 분석표를 볼 수 있어요")).not.toBeInTheDocument();
    });

    it("persists offerId into unlockedOfferIds so the unlock survives a re-render (integration via Result page)", async () => {
      seedState({ current: CURRENT, offers: [OFFER_BETTER], unlockedOfferIds: [] });

      renderAt("/result/offer-1");

      const button = await screen.findByRole("button", { name: /광고/ });
      await waitFor(() => expect(button).not.toBeDisabled());
      fireEvent.click(button);

      await waitFor(() => expect(screen.getAllByTestId("analysis-row")).toHaveLength(6));

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as AppState;
      expect(stored.unlockedOfferIds).toContain("offer-1");
    });
  });

  describe("AC-3[P0]: 재진입 — 이미 해금된 오퍼는 광고 없이 바로 노출", () => {
    it("renders the analysis table immediately for an offer already in unlockedOfferIds, with no ad gate", () => {
      seedState({ current: CURRENT, offers: [OFFER_BETTER], unlockedOfferIds: ["offer-1"] });

      renderAt("/result/offer-1");

      expect(screen.getAllByTestId("analysis-row")).toHaveLength(6);
      expect(screen.queryByText("광고를 보면 상세 분석표를 볼 수 있어요")).not.toBeInTheDocument();
    });
  });

  describe("AC-4[P1]: 분석표 6행 — 항목명/현재점수/오퍼점수/가중치%", () => {
    it("renders exactly 6 rows, each showing label, currentScore, offerScore, and weight percentage", () => {
      render(
        React.createElement(ResultAnalysis, {
          offerId: OFFER_BETTER.id,
          score: SCORE,
          unlocked: true,
          onUnlock: vi.fn(),
        }),
      );

      const rows = screen.getAllByTestId("analysis-row");
      expect(rows).toHaveLength(6);

      const moneyItem = SCORE.items.find((item) => item.key === "money")!;
      const moneyRow = rows.find((row) => within(row).queryByText(moneyItem.label));
      expect(moneyRow).toBeDefined();
      const moneyWeightPct = Math.round(moneyItem.weightRatio * 100);
      expect(moneyRow!.textContent).toContain(String(moneyItem.currentScore));
      expect(moneyRow!.textContent).toContain(String(moneyItem.offerScore));
      expect(moneyRow!.textContent).toContain(`${moneyWeightPct}%`);

      for (const item of SCORE.items) {
        const row = rows.find((r) => within(r).queryByText(item.label));
        expect(row).toBeDefined();
      }
    });
  });

  describe("AC-5[P1]: 협상 포인트 3개 ListRow", () => {
    it("renders exactly 3 negotiation-point ListRows matching score.negotiationPoints", () => {
      expect(SCORE.negotiationPoints).toHaveLength(3);

      render(
        React.createElement(ResultAnalysis, {
          offerId: OFFER_BETTER.id,
          score: SCORE,
          unlocked: true,
          onUnlock: vi.fn(),
        }),
      );

      const points = screen.getAllByTestId("negotiation-point");
      expect(points).toHaveLength(3);
      SCORE.negotiationPoints.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });
  });
});
