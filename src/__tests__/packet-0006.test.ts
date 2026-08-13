import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";

/**
 * TDD Red Phase Tests for packet-0006: 홈 화면 (`/`)
 *
 * Implementation file (not yet created): src/pages/Home.tsx
 *
 * Home reads storage directly (loadOffers/getCurrentOffer/loadMeta/setCalcNoticeAcknowledged
 * from @/lib/storage), matching the sibling Compare.tsx pattern in this branch — there is no
 * shared useOffers() hook here. AC-1 assumes Home models an artificial isLoading window via
 * setTimeout inside its data-load effect (so a skeleton is observable before storage resolves);
 * fake timers are used to freeze that window. All other ACs wait for loading to resolve via
 * findBy* queries so they don't depend on the exact timer delay chosen.
 */

mockTds();
mockAppsInToss();
mockRouter();

import Home from "@/pages/Home";
import { saveOffer, setCalcNoticeAcknowledged, loadMeta } from "@/lib/storage";
import { calcMonthlyNet } from "@/lib/calc";
import { formatNumber } from "@/lib/utils";
import type { Offer } from "@/lib/types";

const currentOffer: Offer = {
  id: "cur-1",
  kind: "current",
  companyName: "현재직장",
  baseSalaryManwon: 6000,
  bonusManwon: 500,
  welfarePointManwon: 100,
  remoteDaysPerWeek: 2,
  commuteMinutesOneWay: 40,
  commuteCostPerDayWon: 3000,
  lunchCostPerDayWon: 8000,
  growthScore: 3,
  cultureScore: 3,
  stabilityScore: 4,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const offer1: Offer = {
  id: "o_1",
  kind: "offer",
  companyName: "카카오",
  baseSalaryManwon: 8000,
  bonusManwon: 1000,
  welfarePointManwon: 200,
  remoteDaysPerWeek: 3,
  commuteMinutesOneWay: 25,
  commuteCostPerDayWon: 2800,
  lunchCostPerDayWon: 0,
  growthScore: 4,
  cultureScore: 4,
  stabilityScore: 3,
  createdAt: 1700000001000,
  updatedAt: 1700000001000,
};

const offer2: Offer = {
  id: "o_2",
  kind: "offer",
  companyName: "네이버",
  baseSalaryManwon: 7500,
  bonusManwon: 600,
  welfarePointManwon: 150,
  remoteDaysPerWeek: 2,
  commuteMinutesOneWay: 35,
  commuteCostPerDayWon: 2500,
  lunchCostPerDayWon: 9000,
  growthScore: 4,
  cultureScore: 3,
  stabilityScore: 4,
  createdAt: 1700000002000,
  updatedAt: 1700000002000,
};

function monthlyNetFor(o: Offer): number {
  return calcMonthlyNet({
    base: o.baseSalaryManwon,
    bonus: o.bonusManwon,
    welfare: o.welfarePointManwon,
    remote: o.remoteDaysPerWeek,
    commute: o.commuteCostPerDayWon,
    lunch: o.lunchCostPerDayWon,
  });
}

function renderHome() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Home)));
}

beforeEach(() => {
  // AlertDialog(AC-5) is opt-out by default (calcNoticeAcknowledged=false); tests that
  // aren't exercising AC-5 pre-acknowledge it so it doesn't block queries.
  setCalcNoticeAcknowledged(true);
});

describe("홈 화면 (`/`)", () => {
  // ==========================================================================
  // AC-1[P0]: 로딩 중 → home-skeleton 3줄만, empty-state 미렌더
  // ==========================================================================
  it("AC-1[P0]: renders a 3-row skeleton while loading and no empty-state, then resolves to real content", async () => {
    vi.useFakeTimers();
    try {
      const { container } = renderHome();

      expect(screen.getByTestId("home-skeleton")).toBeInTheDocument();
      expect(container.querySelectorAll('[data-skeleton="true"]')).toHaveLength(3);
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();

      await vi.runAllTimersAsync();

      expect(screen.queryByTestId("home-skeleton")).not.toBeInTheDocument();
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // ==========================================================================
  // AC-2[P0]: 오퍼 없음 → empty-state(아이콘 + 문구 + CTA block/48px)
  // ==========================================================================
  it("AC-2[P0]: shows empty-state with icon, guidance copy, and a full-width 48px CTA when offers is empty", async () => {
    renderHome();
    const emptyState = await screen.findByTestId("empty-state");

    expect(within(emptyState).getByText("현재 직장을 먼저 등록해요")).toBeInTheDocument();
    expect(within(emptyState).getByRole("img")).toBeInTheDocument(); // Asset.ContentIcon mock

    const cta = within(emptyState).getByRole("button");
    expect(cta).toHaveAttribute("display", "block");
    expect(cta).toHaveStyle({ height: "48px" });
  });

  // ==========================================================================
  // AC-3[P0]: 오퍼 2건 렌더 — 카드 개수/회사명/월 실수령(콤마)/최소 높이
  // ==========================================================================
  it("AC-3[P0]: renders exactly 2 offer-card elements with company name, comma-formatted monthly net, and min-height 64px", async () => {
    saveOffer(currentOffer);
    saveOffer(offer1);
    saveOffer(offer2);

    renderHome();

    const cards = await screen.findAllByTestId("offer-card");
    expect(cards).toHaveLength(2);

    const kakaoCard = cards.find((c) => c.textContent?.includes("카카오"))!;
    const naverCard = cards.find((c) => c.textContent?.includes("네이버"))!;
    expect(kakaoCard).toBeDefined();
    expect(naverCard).toBeDefined();

    const kakaoNet = formatNumber(monthlyNetFor(offer1));
    const naverNet = formatNumber(monthlyNetFor(offer2));
    expect(kakaoNet).toMatch(/^\d{1,3}(,\d{3})+$/); // 천단위 콤마 포맷
    expect(kakaoCard.textContent).toContain(`월 실수령 ${kakaoNet}원`);
    expect(naverCard.textContent).toContain(`월 실수령 ${naverNet}원`);

    expect(kakaoCard).toHaveStyle({ minHeight: "64px" });
    expect(naverCard).toHaveStyle({ minHeight: "64px" });
  });

  // ==========================================================================
  // AC-4[P0]: 카드 탭 → navigate('/compare', { state: { targetOfferId } })
  // ==========================================================================
  it("AC-4[P0]: tapping an offer-card navigates to /compare with the offer's id as RouteState", async () => {
    saveOffer(currentOffer);
    saveOffer(offer1);
    saveOffer(offer2);

    renderHome();

    const cards = await screen.findAllByTestId("offer-card");
    const kakaoCard = cards.find((c) => c.textContent?.includes("카카오"))!;

    fireEvent.click(kakaoCard);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/compare", {
      state: { targetOfferId: "o_1" },
    });
  });

  // ==========================================================================
  // AC-5[P0]: 계산 방식 고지 AlertDialog — 최초 1회, 확인 시 저장, 재진입 시 미표시
  // ==========================================================================
  it("AC-5[P0]: shows the calc-notice AlertDialog once when unacknowledged, persists on confirm, and hides it thereafter", async () => {
    setCalcNoticeAcknowledged(false);
    expect(loadMeta().calcNoticeAcknowledged).toBe(false);

    const first = renderHome();
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/입력값 기반 규칙 계산 결과/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "확인" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(loadMeta().calcNoticeAcknowledged).toBe(true);

    first.unmount();
    renderHome();
    await screen.findByTestId("empty-state");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
