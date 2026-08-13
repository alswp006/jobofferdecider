import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockLocation } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();
mockRouter();

import Compare from "@/pages/Compare";
import { saveOffer, saveWeights } from "@/lib/storage";
import { DEFAULT_WEIGHTS, type Offer } from "@/lib/types";

const currentOffer: Offer = {
  id: "cur-1", kind: "current", companyName: "현재직장",
  baseSalaryManwon: 6000, bonusManwon: 500, welfarePointManwon: 100,
  remoteDaysPerWeek: 2, commuteMinutesOneWay: 40, commuteCostPerDayWon: 3000,
  lunchCostPerDayWon: 8000, growthScore: 3, cultureScore: 3, stabilityScore: 4,
  createdAt: 1700000000000, updatedAt: 1700000000000,
};
const targetOffer: Offer = {
  id: "o_1", kind: "offer", companyName: "카카오",
  baseSalaryManwon: 8000, bonusManwon: 1000, welfarePointManwon: 200,
  remoteDaysPerWeek: 3, commuteMinutesOneWay: 25, commuteCostPerDayWon: 2800,
  lunchCostPerDayWon: 0, growthScore: 4, cultureScore: 4, stabilityScore: 3,
  createdAt: 1700000001000, updatedAt: 1700000001000,
};

beforeEach(() => { mockLocation.state = null; });

describe("debug", () => {
  it("click", async () => {
    saveOffer(currentOffer);
    saveOffer(targetOffer);
    saveWeights(DEFAULT_WEIGHTS);
    mockLocation.pathname = "/compare";
    (mockLocation as { state: unknown }).state = { targetOfferId: targetOffer.id };
    render(React.createElement(MemoryRouter, null, React.createElement(Compare)));

    const watchButton = screen.getByRole("button", { name: "광고 보고 결과 보기" });
    console.log("BEFORE WAIT", watchButton.outerHTML);
    await waitFor(() => expect(watchButton).not.toBeDisabled());
    console.log("AFTER WAIT", watchButton.outerHTML, "isConnected=", watchButton.isConnected);
    watchButton.click();
    console.log("AFTER CLICK", document.body.innerHTML);
    await new Promise((r) => setTimeout(r, 50));
    console.log("AFTER DELAY", document.body.innerHTML);
  });
});
