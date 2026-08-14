import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "node:fs";
import { execSync } from "node:child_process";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAppsInToss } from "@/__tests__/__helpers__/mocks";

// SDK is imperative-only and throws outside a WebView — FloatingTabBar guards it,
// but jsdom still needs the module mocked so the guard's try/catch has something to call.
mockAppsInToss();

// App.tsx owns routing only (per this packet's scope) — every page it routes to is
// mocked so these tests assert wiring, not the (separately tested) page internals.
vi.mock("@/pages/Home", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "Home"),
}));
vi.mock("@/pages/CompanyForm", () => ({
  default: () => React.createElement("div", { "data-testid": "page-company-form" }, "CompanyForm"),
}));
vi.mock("@/pages/Weights", () => ({
  default: () => React.createElement("div", { "data-testid": "page-weights" }, "Weights"),
}));
vi.mock("@/pages/Result", () => ({
  default: () => React.createElement("div", { "data-testid": "page-result" }, "Result"),
}));
vi.mock("@/pages/Compare", () => ({
  default: () => React.createElement("div", { "data-testid": "page-compare" }, "Compare"),
}));
vi.mock("@/components/AppErrorBoundary", () => ({
  AppErrorBoundary: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "app-error-boundary" }, children),
}));
vi.mock("@/components/OnboardingDialog", () => ({
  OnboardingDialog: () => React.createElement("div", { "data-testid": "onboarding-dialog" }),
}));

import App from "@/App";

function renderAt(path: string) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(App)),
  );
}

describe("Packet 0018: 라우터 배선 + FloatingTabBar + 전역 Provider", () => {
  describe("AC-1[P0]: 7개 경로 전부 직접 URL 진입 시 해당 페이지가 렌더된다", () => {
    it("renders the matching page with no crash for every one of the 7 routes", () => {
      const cases: Array<[string, string]> = [
        ["/", "page-home"],
        ["/company/current", "page-company-form"],
        ["/company/offer/new", "page-company-form"],
        ["/company/offer/abc-123", "page-company-form"],
        ["/weights", "page-weights"],
        ["/result/offer-1", "page-result"],
        ["/compare", "page-compare"],
      ];

      cases.forEach(([path, testId]) => {
        const { unmount } = renderAt(path);
        expect(screen.getByTestId(testId)).not.toBeNull();
        expect(screen.queryAllByTestId(/^page-/)).toHaveLength(1);
        unmount();
      });
    });
  });

  describe("AC-2[P0]: 정의되지 않은 경로는 홈으로 리다이렉트된다", () => {
    it("redirects any unknown path to the home page instead of rendering blank", () => {
      const { unmount } = renderAt("/foo");
      expect(screen.getByTestId("page-home")).not.toBeNull();
      expect(screen.queryByTestId("page-company-form")).toBeNull();
      unmount();

      renderAt("/does/not/exist");
      expect(screen.getByTestId("page-home")).not.toBeNull();
    });
  });

  describe("AC-3: AppErrorBoundary가 Routes를 감싸고 OnboardingDialog가 최상위에 노출된다", () => {
    it("wraps the routed page inside AppErrorBoundary and mounts OnboardingDialog", () => {
      renderAt("/");
      const boundary = screen.getByTestId("app-error-boundary");
      const page = screen.getByTestId("page-home");
      expect(boundary.contains(page)).toBe(true);
      expect(screen.getByTestId("onboarding-dialog")).not.toBeNull();
    });
  });

  describe("AC-4: / 와 /weights에서 FloatingTabBar 2탭이 컬러 틴트로 표시된다", () => {
    it("shows exactly 2 tabs on / with the home tab tinted blue and the other grey", () => {
      renderAt("/");
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      const active = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      const inactive = tabs.filter((t) => t.getAttribute("aria-selected") !== "true");
      expect(active).toHaveLength(1);
      expect(active[0].style.color).toBe("var(--adaptiveBlue500)");
      expect(inactive[0].style.color).toBe("var(--adaptiveGrey700)");
    });

    it("shows exactly 2 tabs on /weights with the weights tab tinted blue", () => {
      renderAt("/weights");
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);

      const active = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      expect(active).toHaveLength(1);
      expect(active[0].style.color).toBe("var(--adaptiveBlue500)");
    });

    it("does not render the 2-tab bar on non tab-root routes like /compare", () => {
      renderAt("/compare");
      expect(screen.queryAllByRole("tab")).toHaveLength(0);
    });
  });

  describe("AC-5: main.tsx는 이 패킷에서 수정되지 않는다", () => {
    it("keeps src/main.tsx at zero diff and its @AI:ANCHOR guard intact", () => {
      const diff = execSync("git diff --stat -- src/main.tsx", {
        cwd: process.cwd(),
      }).toString();
      expect(diff.trim()).toBe("");

      const content = fs.readFileSync("src/main.tsx", "utf-8");
      expect(content).toContain("@AI:ANCHOR");
      expect(content).toContain("BrowserRouter");
    });
  });
});
