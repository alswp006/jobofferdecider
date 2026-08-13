import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, within, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { Offer, Weights, ScoreResult } from "@/lib/types";

/**
 * TDD Red Phase Tests for packet-0014: 순위 비교 화면 (`/rank`)
 *
 * Implementation file (not yet created): src/pages/Rank.tsx
 *
 * Rank는 현재 직장 1건 + 등록된 오퍼(최대 3건)를 한 화면에서 총점 내림차순으로
 * 비교한다. 오퍼별 총점은 `@/lib/score`의 buildScoreResult(current, offer, weights)로
 * 계산되므로, 이 테스트는 storage(@/lib/storage)와 score(@/lib/score)를 목킹해
 * Rank 페이지 자체의 정렬/표시/네비게이션 로직만 검증한다.
 */

mockTds();
mockAppsInToss();
mockRouter();

const mockLoadOffers = vi.fn();
const mockGetCurrentOffer = vi.fn();
const mockLoadWeights = vi.fn();
const mockBuildScoreResult = vi.fn();

vi.mock("@/lib/storage", () => ({
  loadOffers: (...args: unknown[]) => mockLoadOffers(...args),
  getCurrentOffer: (...args: unknown[]) => mockGetCurrentOffer(...args),
  loadWeights: (...args: unknown[]) => mockLoadWeights(...args),
  getOfferById: vi.fn(),
  saveOffer: vi.fn(),
  deleteOffer: vi.fn(),
  newOfferId: vi.fn(() => "o_test"),
  saveWeights: vi.fn(),
  loadUnlock: vi.fn(() => ({ unlockedComparisonKeys: [], updatedAt: 0 })),
  addUnlockKey: vi.fn(),
  loadMeta: vi.fn(() => ({ schemaVersion: 1, calcNoticeAcknowledged: false, onboardedAt: null })),
  setCalcNoticeAcknowledged: vi.fn(),
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@/lib/score", () => ({
  buildScoreResult: (...args: unknown[]) => mockBuildScoreResult(...args),
}));

import Rank from "@/pages/Rank";

// ── fixtures ──
const WEIGHTS: Weights = {
  money: 5,
  remote: 5,
  commute: 5,
  growth: 5,
  culture: 5,
  stability: 5,
  updatedAt: 0,
};

function makeOffer(overrides: Partial<Offer>): Offer {
  return {
    id: "id",
    kind: "offer",
    companyName: "회사",
    baseSalaryManwon: 5000,
    bonusManwon: 0,
    welfarePointManwon: 0,
    remoteDaysPerWeek: 0,
    commuteMinutesOneWay: 30,
    commuteCostPerDayWon: 3000,
    lunchCostPerDayWon: 8000,
    growthScore: 3,
    cultureScore: 3,
    stabilityScore: 3,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

function makeScoreResult(overrides: Partial<ScoreResult>): ScoreResult {
  return {
    currentOfferId: "current",
    targetOfferId: "target",
    axes: [],
    totalCurrent: 65.0,
    totalTarget: 70.0,
    gap: 5,
    money: {
      currentMonthlyNetWon: 3000000,
      targetMonthlyNetWon: 3200000,
      diffMonthlyWon: 200000,
      diffYearlyWon: 2400000,
      currentTaxWon: 0,
      targetTaxWon: 0,
    },
    verdict: "neutral",
    negotiationPoints: [],
    computedAt: 0,
    ...overrides,
  };
}

function renderRank() {
  return render(React.createElement(MemoryRouter, null, React.createElement(Rank)));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLoadWeights.mockReturnValue(WEIGHTS);
});

describe("순위 비교 화면 (`/rank`)", () => {
  it("AC-1[P0]: 오퍼 3건 등록 시 rank-row가 4개(현재 직장 포함) 렌더되고 총점 내림차순 정렬된다", () => {
    const current = makeOffer({ id: "cur", kind: "current", companyName: "우리 회사", createdAt: 100 });
    const offA = makeOffer({ id: "offA", companyName: "A상사", createdAt: 2000 });
    const offB = makeOffer({ id: "offB", companyName: "B전자", createdAt: 3000 });
    const offC = makeOffer({ id: "offC", companyName: "C컴퍼니", createdAt: 4000 });

    mockLoadOffers.mockReturnValue([current, offA, offB, offC]);
    mockGetCurrentOffer.mockReturnValue(current);
    mockBuildScoreResult.mockImplementation((_cur: Offer, target: Offer) => {
      const totals: Record<string, number> = { offA: 72.3, offB: 81.7, offC: 55.2 };
      return makeScoreResult({ targetOfferId: target.id, totalCurrent: 60.0, totalTarget: totals[target.id] });
    });

    renderRank();

    const rows = screen.getAllByTestId("rank-row");
    expect(rows).toHaveLength(4);
    // 내림차순: B전자(81.7) > A상사(72.3) > 우리 회사(60.0) > C컴퍼니(55.2)
    expect(within(rows[0]).getByText(/B전자/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/A상사/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/우리 회사/)).toBeInTheDocument();
    expect(within(rows[3]).getByText(/C컴퍼니/)).toBeInTheDocument();
  });

  it("AC-2[P0]: 총점 동점 시 createdAt 오름차순으로 안정 정렬되고 재렌더에도 순서가 유지된다", () => {
    const current = makeOffer({ id: "cur2", kind: "current", companyName: "현재직장", createdAt: 50 });
    const offX = makeOffer({ id: "offX", companyName: "X사", createdAt: 1000 });
    const offY = makeOffer({ id: "offY", companyName: "Y사", createdAt: 500 });

    mockLoadOffers.mockReturnValue([current, offX, offY]);
    mockGetCurrentOffer.mockReturnValue(current);
    mockBuildScoreResult.mockImplementation((_cur: Offer, target: Offer) =>
      makeScoreResult({ targetOfferId: target.id, totalCurrent: 60.0, totalTarget: 75.0 }),
    );

    const first = renderRank();
    const firstRows = screen.getAllByTestId("rank-row");
    // 동점(75.0)인 X/Y 중 createdAt이 이른 Y사가 앞에 온다
    expect(within(firstRows[0]).getByText(/Y사/)).toBeInTheDocument();
    expect(within(firstRows[1]).getByText(/X사/)).toBeInTheDocument();
    first.unmount();
    cleanup();

    renderRank();
    const secondRows = screen.getAllByTestId("rank-row");
    expect(within(secondRows[0]).getByText(/Y사/)).toBeInTheDocument();
    expect(within(secondRows[1]).getByText(/X사/)).toBeInTheDocument();
  });

  it("AC-3[P0]: 각 행에 'N위' 순위, 회사명, 총점(소수 1자리), 월 실수령(천단위 콤마)이 표시된다", () => {
    const current = makeOffer({ id: "cur3", kind: "current", companyName: "우리회사", createdAt: 10 });
    const offer1 = makeOffer({ id: "off1", companyName: "드림컴퍼니", createdAt: 20 });

    mockLoadOffers.mockReturnValue([current, offer1]);
    mockGetCurrentOffer.mockReturnValue(current);
    mockBuildScoreResult.mockReturnValue(
      makeScoreResult({
        targetOfferId: "off1",
        totalCurrent: 65.4,
        totalTarget: 78.9,
        money: {
          currentMonthlyNetWon: 3123456,
          targetMonthlyNetWon: 4123456,
          diffMonthlyWon: 1000000,
          diffYearlyWon: 12000000,
          currentTaxWon: 0,
          targetTaxWon: 0,
        },
      }),
    );

    renderRank();

    const rows = screen.getAllByTestId("rank-row");
    expect(rows).toHaveLength(2);

    // 1위: 드림컴퍼니 (78.9점, 월 4,123,456원)
    expect(within(rows[0]).getByText(/1위/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/드림컴퍼니/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/78\.9/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/4,123,456/)).toBeInTheDocument();

    // 2위: 우리회사 (65.4점, 월 3,123,456원)
    expect(within(rows[1]).getByText(/2위/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/우리회사/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/65\.4/)).toBeInTheDocument();
    expect(within(rows[1]).getByText(/3,123,456/)).toBeInTheDocument();
  });

  it("AC-4[P0]: 오퍼 행 탭 시 navigate('/compare', { state: { targetOfferId } }) 호출, 현재 직장 행은 이동하지 않는다", () => {
    const current = makeOffer({ id: "cur4", kind: "current", companyName: "현재 직장", createdAt: 5 });
    const offer1 = makeOffer({ id: "off4", companyName: "새 오퍼", createdAt: 8 });

    mockLoadOffers.mockReturnValue([current, offer1]);
    mockGetCurrentOffer.mockReturnValue(current);
    mockBuildScoreResult.mockReturnValue(
      makeScoreResult({ targetOfferId: "off4", totalCurrent: 50.0, totalTarget: 90.0 }),
    );

    renderRank();

    const rows = screen.getAllByTestId("rank-row");
    // 90점인 오퍼가 1위(rows[0]), 현재 직장은 rows[1]
    fireEvent.click(rows[0]);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/compare", { state: { targetOfferId: "off4" } });

    mockNavigate.mockClear();
    fireEvent.click(rows[1]);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-5[P0]: 오퍼 0건이면 EmptyState '비교할 오퍼가 없어요' + '오퍼 추가하기' Button이 렌더된다", () => {
    const current = makeOffer({ id: "cur5", kind: "current", companyName: "현재 직장", createdAt: 1 });
    mockLoadOffers.mockReturnValue([current]);
    mockGetCurrentOffer.mockReturnValue(current);

    renderRank();

    expect(screen.getByText("비교할 오퍼가 없어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /오퍼 추가하기/ })).toBeInTheDocument();
    expect(screen.queryAllByTestId("rank-row")).toHaveLength(0);
  });
});
