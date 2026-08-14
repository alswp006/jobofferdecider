import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEY, SCORE_LABELS } from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { AppState, Weights as WeightsType } from "@/lib/types";

mockTds();
mockAppsInToss();

import Weights from "@/pages/Weights";
import { FloatingTabBar } from "@/components/FloatingTabBar";

function seedState(weights: WeightsType): AppState {
  return {
    version: 1,
    current: null,
    offers: [],
    weights,
    unlockedOfferIds: [],
  };
}

function renderWeights() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/weights"] }, React.createElement(Weights)),
  );
}

// Mirrors App.tsx's tab-root composition (Outlet + FloatingTabBar) so the test can
// verify the tab bar renders correctly around the real Weights page without coupling
// to Home/CompanyForm/Result/Compare internals.
function TestTabRootLayout() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Outlet),
    React.createElement(FloatingTabBar, {
      items: [
        { label: "홈", path: "/" },
        { label: "중요도", path: "/weights" },
      ],
    }),
  );
}

function renderWithTabLayout(initialPath: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      React.createElement(
        Routes,
        null,
        React.createElement(
          Route,
          { element: React.createElement(TestTabRootLayout) },
          React.createElement(Route, { path: "/", element: React.createElement("div", { "data-testid": "page-home" }) }),
          React.createElement(Route, { path: "/weights", element: React.createElement(Weights) }),
        ),
      ),
    ),
  );
}

function getSlider(name: string): HTMLInputElement {
  return screen.getByRole("slider", { name }) as HTMLInputElement;
}

const ALL_LABELS = [
  SCORE_LABELS.money,
  SCORE_LABELS.growth,
  SCORE_LABELS.workLife,
  SCORE_LABELS.stability,
  SCORE_LABELS.culture,
  SCORE_LABELS.commuteEase,
];

describe("중요도 설정 페이지 (S3)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("AC-1: 6개 슬라이더가 SCORE_LABELS 라벨로 렌더되고 초기값이 저장된 weights와 일치한다", () => {
    it("defaults every slider to 50 when no weights are saved yet", () => {
      renderWeights();

      expect(screen.getAllByRole("slider")).toHaveLength(6);
      ALL_LABELS.forEach((label) => {
        expect(getSlider(label).value).toBe("50");
      });
    });

    it("restores each slider to the saved weight for its category", () => {
      const saved: WeightsType = {
        money: 80,
        growth: 10,
        workLife: 30,
        stability: 90,
        culture: 60,
        commuteEase: 20,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState(saved)));

      renderWeights();

      expect(getSlider(SCORE_LABELS.money).value).toBe("80");
      expect(getSlider(SCORE_LABELS.growth).value).toBe("10");
      expect(getSlider(SCORE_LABELS.workLife).value).toBe("30");
      expect(getSlider(SCORE_LABELS.stability).value).toBe("90");
      expect(getSlider(SCORE_LABELS.culture).value).toBe("60");
      expect(getSlider(SCORE_LABELS.commuteEase).value).toBe("20");
    });
  });

  describe("AC-2: 슬라이더를 움직인 뒤 새로고침하면 변경된 값이 localStorage에서 복원된다", () => {
    it("persists a slider change to localStorage and restores it on remount", () => {
      const { unmount } = renderWeights();

      fireEvent.change(getSlider(SCORE_LABELS.money), { target: { value: "80" } });

      const stored: AppState = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.weights.money).toBe(80);
      expect(stored.weights.growth).toBe(50);

      unmount();
      renderWeights();

      expect(getSlider(SCORE_LABELS.money).value).toBe("80");
    });
  });

  describe("AC-3: '기본값으로 되돌리기' 탭 시 6개 값이 전부 50으로 되돌아간다", () => {
    it("resets every slider to 50 and persists DEFAULT_WEIGHTS", () => {
      const saved: WeightsType = {
        money: 5,
        growth: 15,
        workLife: 25,
        stability: 35,
        culture: 45,
        commuteEase: 5,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState(saved)));

      renderWeights();
      fireEvent.click(screen.getByRole("button", { name: "기본값으로 되돌리기" }));

      ALL_LABELS.forEach((label) => {
        expect(getSlider(label).value).toBe("50");
      });

      const stored: AppState = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.weights).toEqual(DEFAULT_WEIGHTS);
    });
  });

  describe("AC-4: 6개 값이 모두 0이면 합계 0 안내 문구가 보인다", () => {
    it("shows the zero-sum notice only when all six weights are 0", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seedState({ money: 0, growth: 0, workLife: 0, stability: 0, culture: 0, commuteEase: 0 })),
      );
      renderWeights();

      expect(screen.getByText("하나 이상은 0보다 커야 정확해요")).toBeInTheDocument();
    });

    it("hides the zero-sum notice when at least one weight is above 0", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(seedState({ money: 10, growth: 0, workLife: 0, stability: 0, culture: 0, commuteEase: 0 })),
      );
      renderWeights();

      expect(screen.queryByText("하나 이상은 0보다 커야 정확해요")).not.toBeInTheDocument();
    });
  });

  describe("AC-5: FloatingTabBar가 노출되고 가중치 탭이 활성 틴트로 표시된다", () => {
    it("renders exactly one tab bar with the 중요도 tab selected and tinted blue", () => {
      renderWithTabLayout("/weights");

      // Weights.tsx must not render its own tab bar (App.tsx's TabRootLayout owns it) —
      // exactly one tablist should exist, not a duplicate.
      expect(screen.getAllByRole("tablist")).toHaveLength(1);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      const weightsTab = screen.getByRole("tab", { name: "중요도" });
      const homeTab = screen.getByRole("tab", { name: "홈" });
      expect(weightsTab.getAttribute("aria-selected")).toBe("true");
      expect(homeTab.getAttribute("aria-selected")).toBe("false");
      expect(weightsTab.style.color).toBe("var(--adaptiveBlue500)");
      expect(homeTab.style.color).toBe("var(--adaptiveGrey700)");
    });
  });
});
