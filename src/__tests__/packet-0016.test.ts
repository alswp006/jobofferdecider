import { describe, it, expect } from "vitest";
import React from "react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { screen, within } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockTossRewardAd } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS } from "@/lib/types";
import type { Offer } from "@/lib/types";

/**
 * TDD Red Phase Tests for packet-0016: 라우팅 + FloatingTabBar 배선 (App.tsx 단독 소유)
 *
 * Implementation files (not yet created/wired): src/App.tsx (routes + global FloatingTabBar),
 * src/components/FloatingTabBar.tsx (already exists — App.tsx must wire it in, not each page).
 *
 * NOTE: mockRouter() from __helpers__/mocks is intentionally NOT used — it stubs useLocation
 * to a fixed "/" value, which would break App.tsx's real route matching and FloatingTabBar's
 * active-tab detection. This packet exercises real MemoryRouter routing, so only TDS/SDK/ad
 * mocks are applied; react-router-dom runs unmocked.
 */

mockTds();
mockAppsInToss();
mockTossRewardAd();

import App from "@/App";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

function makeOffer(overrides: Partial<Offer>): Offer {
  return {
    id: "o_current",
    kind: "current",
    companyName: "현재 회사",
    baseSalaryManwon: 5000,
    bonusManwon: 500,
    welfarePointManwon: 100,
    remoteDaysPerWeek: 2,
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

describe("라우팅 + FloatingTabBar 배선 (App.tsx 단독 소유)", () => {
  it("AC-1[P0]: 6개 화면 라우트에 직접 진입하면 흰 화면 없이 각 페이지 헤더가 렌더된다", () => {
    const cases: Array<{ path: string; state?: unknown; expectedTitle: string }> = [
      { path: "/", expectedTitle: "이직 결정" },
      { path: "/offers", expectedTitle: "내 직장·오퍼" },
      { path: "/offer/new", state: { kind: "offer" }, expectedTitle: "받은 오퍼" },
      { path: "/offer/abc123/edit", expectedTitle: "받은 오퍼" },
      { path: "/weights", expectedTitle: "무엇이 더 중요한가요?" },
      { path: "/rank", expectedTitle: "오퍼 순위" },
    ];

    for (const { path: p, state, expectedTitle } of cases) {
      const { unmount, container } = renderWithRouter(React.createElement(App), {
        initialEntries: [{ pathname: p, state: state ?? null }],
      });

      // no white screen: the page rendered meaningful content
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
      expect(screen.getByText(expectedTitle)).toBeInTheDocument();

      unmount();
    }
  });

  it("AC-1[P0]: /compare는 state 없이 진입해도 흰 화면 없이 헤더가 렌더된다", () => {
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/compare", state: { targetOfferId: "missing" } }],
    });

    expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(screen.getByText("비교 결과")).toBeInTheDocument();
  });

  it("AC-2[P0]: 알 수 없는 경로로 진입하면 홈으로 리다이렉트된다", async () => {
    renderWithRouter(React.createElement(App), {
      initialEntries: ["/this-route-does-not-exist"],
    });

    expect(await screen.findByText("이직 결정")).toBeInTheDocument();
    // Home-specific empty-state copy confirms Home actually rendered, not a blank shell
    expect(await screen.findByText(/현재 직장을 먼저 등록해요/)).toBeInTheDocument();
  });

  it("AC-3[P0]: FloatingTabBar가 홈/오퍼/가중치 3탭으로 렌더되고 현재 경로 탭에만 aria-selected가 적용된다", async () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/weights"] });

    const tablist = await screen.findByRole("tablist", { name: "메인 네비게이션" });
    const tabs = within(tablist).getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(tabs.map((t) => t.getAttribute("aria-label"))).toEqual(["홈", "오퍼", "가중치"]);

    const activeTab = tabs.find((t) => t.getAttribute("aria-label") === "가중치")!;
    expect(activeTab.getAttribute("aria-selected")).toBe("true");
    const homeTab = tabs.find((t) => t.getAttribute("aria-label") === "홈")!;
    expect(homeTab.getAttribute("aria-selected")).toBe("false");
  });

  it("AC-3: /compare, /offer/new 에서는 탭바가 노출되지 않는다", () => {
    const { unmount: unmountCompare } = renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/compare", state: { targetOfferId: "missing" } }],
    });
    expect(screen.queryByRole("tablist", { name: "메인 네비게이션" })).not.toBeInTheDocument();
    unmountCompare();

    renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/offer/new", state: { kind: "offer" } }],
    });
    expect(screen.queryByRole("tablist", { name: "메인 네비게이션" })).not.toBeInTheDocument();
  });

  it("AC-4[P0]: navigate state가 RouteState 형태를 따르며 Home → Compare로 targetOfferId가 정확히 전달된다", async () => {
    seedLocalStorage({
      [STORAGE_KEYS.OFFERS]: [
        makeOffer({ id: "o_current", kind: "current", companyName: "현재 회사" }),
        makeOffer({
          id: "o_target_1",
          kind: "offer",
          companyName: "새로운 회사",
          createdAt: 2000,
          updatedAt: 2000,
        }),
      ],
    });

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    const [offerCard] = await screen.findAllByTestId("offer-card");
    expect(offerCard.textContent).toContain("새로운 회사");
    offerCard.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    // Compare renders without the "no target selected" guard — proving the
    // { targetOfferId: string } state shape (RouteState["/compare"]) round-tripped correctly.
    expect(await screen.findByText("비교 결과")).toBeInTheDocument();
    expect(screen.queryByText("어떤 오퍼를 비교할지 선택해주세요")).not.toBeInTheDocument();
  });

  it("AC-5: src/main.tsx는 수정되지 않고 @AI:ANCHOR 주석 및 <App /> 마운트를 보존한다", () => {
    const mainSource = fs.readFileSync(path.join(projectRoot, "src/main.tsx"), "utf-8");
    expect(mainSource).toContain("@AI:ANCHOR");
    expect(mainSource).toContain("<App />");
  });

  it("통합: App.tsx가 6개 필수 경로 전부에 대응하는 Route를 정의한다", () => {
    const appSource = fs.readFileSync(path.join(projectRoot, "src/App.tsx"), "utf-8");
    const requiredPaths = ["/", "/offers", "/offer/new", "/offer/:id/edit", "/weights", "/compare", "/rank"];
    for (const p of requiredPaths) {
      expect(appSource).toContain(`"${p}"`);
    }
    expect(appSource).toContain("FloatingTabBar");
  });
});
