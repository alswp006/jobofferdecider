import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockLocation } from "@/__tests__/__helpers__/mocks";

/**
 * TDD Red Phase Tests for packet-0011: 비교 화면 — state 가드 + 요약 + 리워드 게이트 (`/compare`)
 *
 * Implementation file (not yet created): src/pages/Compare.tsx
 *
 * NOTE: TossRewardAd is intentionally NOT mocked here — the real component
 * (src/components/TossRewardAd.tsx) is rendered so the gate/unlock/error flow is
 * exercised end-to-end through the mocked @apps-in-toss/web-framework SDK
 * (loadFullScreenAd / showFullScreenAd). Compare.tsx MUST pass
 * buttonText="광고 보고 결과 보기" to <TossRewardAd> to satisfy AC-3's exact CTA copy.
 * AC-5 requires the ad-failure path to surface a Toast + retry (no silent auto-unlock),
 * so the Coder is expected to extend TossRewardAd (e.g. an `onError` prop) rather than
 * relying on its current "auto-unlock on any failure" fallback.
 */

mockTds();
mockAppsInToss();
mockRouter();

import Compare from "@/pages/Compare";
import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { saveOffer, saveWeights, addUnlockKey, loadUnlock } from "@/lib/storage";
import { buildScoreResult } from "@/lib/score";
import { DEFAULT_WEIGHTS, VERDICT_LABELS, type Offer } from "@/lib/types";

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

const targetOffer: Offer = {
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

const unlockKey = `${currentOffer.id}:${targetOffer.id}`;
const expectedResult = buildScoreResult(currentOffer, targetOffer, DEFAULT_WEIGHTS);
const verdictLabel = VERDICT_LABELS[expectedResult.verdict];

function renderCompare(targetOfferId: string | undefined) {
  mockLocation.pathname = "/compare";
  (mockLocation as { state: unknown }).state = targetOfferId ? { targetOfferId } : null;
  return render(React.createElement(MemoryRouter, null, React.createElement(Compare)));
}

beforeEach(() => {
  mockLocation.state = null;
});

describe("비교 화면 — state 가드 + 요약 + 리워드 게이트 (`/compare`)", () => {
  // ==========================================================================
  // AC-1[P0]: location.state 없음/targetOfferId 무효 → compare-guard + '홈으로 가기'
  // ==========================================================================
  it("AC-1[P0]: renders compare-guard with a '홈으로 가기' button when location.state is missing, without crashing", () => {
    saveOffer(currentOffer);
    saveWeights(DEFAULT_WEIGHTS);

    expect(() => renderCompare(undefined)).not.toThrow();

    expect(screen.getByTestId("compare-guard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈으로 가기" })).toBeInTheDocument();
  });

  it("AC-1[P0]: renders compare-guard when targetOfferId does not match any stored offer", () => {
    saveOffer(currentOffer);
    saveWeights(DEFAULT_WEIGHTS);

    renderCompare("does-not-exist");

    expect(screen.getByTestId("compare-guard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "홈으로 가기" })).toBeInTheDocument();
  });

  // ==========================================================================
  // AC-2[P1]: 현재 직장 미등록 → 안내 + 등록 이동 Button
  // ==========================================================================
  it("AC-2[P1]: shows '현재 직장부터 등록해주세요' guidance and a registration button when no current offer is saved", () => {
    saveOffer(targetOffer);
    saveWeights(DEFAULT_WEIGHTS);

    renderCompare(targetOffer.id);

    expect(screen.getByText("현재 직장부터 등록해주세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /등록/ })).toBeInTheDocument();
    expect(screen.queryByTestId("compare-guard")).not.toBeInTheDocument();
  });

  // ==========================================================================
  // AC-3[P0]: 미해제 비교 → 상세 감춤 + '광고 보고 결과 보기' CTA로 게이트
  // ==========================================================================
  it("AC-3[P0]: hides the score detail and gates it behind a '광고 보고 결과 보기' TossRewardAd CTA when unlocked", () => {
    saveOffer(currentOffer);
    saveOffer(targetOffer);
    saveWeights(DEFAULT_WEIGHTS);

    renderCompare(targetOffer.id);

    expect(screen.getByRole("button", { name: "광고 보고 결과 보기" })).toBeInTheDocument();
    expect(screen.queryByText(verdictLabel)).not.toBeInTheDocument();
    expect(loadUnlock().unlockedComparisonKeys).not.toContain(unlockKey);
  });

  // ==========================================================================
  // AC-4[P0]: 광고 시청 완료 → unlock(currentId,targetId) 호출 → 재진입 시 게이트 없음
  // ==========================================================================
  it("AC-4[P0]: unlocks and reveals the detail after the reward ad completes, persisting the unlock key", async () => {
    saveOffer(currentOffer);
    saveOffer(targetOffer);
    saveWeights(DEFAULT_WEIGHTS);

    renderCompare(targetOffer.id);

    const watchButton = screen.getByRole("button", { name: "광고 보고 결과 보기" });
    await waitFor(() => expect(watchButton).not.toBeDisabled());
    watchButton.click();

    expect(await screen.findByText(verdictLabel)).toBeInTheDocument();
    expect(loadUnlock().unlockedComparisonKeys).toContain(unlockKey);
    expect(loadUnlock().updatedAt).toBeGreaterThan(0);
  });

  it("AC-4[P0]: shows the detail immediately without an ad gate when the comparison was already unlocked", () => {
    saveOffer(currentOffer);
    saveOffer(targetOffer);
    saveWeights(DEFAULT_WEIGHTS);
    addUnlockKey(unlockKey);

    renderCompare(targetOffer.id);

    expect(screen.getByText(verdictLabel)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "광고 보고 결과 보기" })).not.toBeInTheDocument();
  });

  // ==========================================================================
  // AC-5[P1]: 광고 로드/시청 실패 → Toast + 다시 시도 Button (영구 잠금 없음)
  // ==========================================================================
  it("AC-5[P1]: shows a failure Toast with a retry button on ad failure, without permanently locking the comparison", async () => {
    saveOffer(currentOffer);
    saveOffer(targetOffer);
    saveWeights(DEFAULT_WEIGHTS);

    vi.mocked(showFullScreenAd).mockImplementationOnce(((opts: any) => {
      setTimeout(() => opts.onError?.({ message: "ad failed" }), 0);
    }) as unknown as typeof showFullScreenAd);

    renderCompare(targetOffer.id);

    const watchButton = screen.getByRole("button", { name: "광고 보고 결과 보기" });
    await waitFor(() => expect(watchButton).not.toBeDisabled());
    watchButton.click();

    expect(
      await screen.findByText("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요."),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /다시 시도/ });
    expect(retryButton).toBeInTheDocument();
    expect(loadUnlock().unlockedComparisonKeys).not.toContain(unlockKey);

    // Retry recovers — no permanent lock
    retryButton.click();
    await waitFor(() => expect(vi.mocked(loadFullScreenAd)).toHaveBeenCalled());
    const retriedWatchButton = await screen.findByRole("button", { name: "광고 보고 결과 보기" });
    await waitFor(() => expect(retriedWatchButton).not.toBeDisabled());
    retriedWatchButton.click();

    expect(await screen.findByText(verdictLabel)).toBeInTheDocument();
    expect(loadUnlock().unlockedComparisonKeys).toContain(unlockKey);
  });
});
