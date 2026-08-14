/**
 * Opt-in test mocks — react-router-dom and TossRewardAd.
 *
 * ⚠️ Why these live in their own file instead of mocks.ts:
 * Vitest hoists every `vi.mock(...)` call to the top of whichever FILE it is
 * written in, as soon as that file is evaluated — regardless of whether the
 * function it's nested in (mockRouter(), mockTossRewardAd()) is ever called.
 * When these were defined inside mocks.ts alongside mockTds()/mockAppsInToss(),
 * simply importing `{ mockTds, mockAppsInToss }` from mocks.ts (without ever
 * calling mockRouter()) silently mocked "react-router-dom" for the whole test
 * file anyway. That broke any test asserting on real react-router-dom behavior
 * (e.g. FloatingTabBar's useLocation()-based active-tab tinting), because
 * useLocation() resolved to the static `mockLocation` stub instead of the
 * real route.
 *
 * Keeping this mock in its own module means only test files that literally
 * import from here (i.e. actually want react-router-dom/TossRewardAd mocked)
 * trigger the hoist. Files that only import mockTds/mockAppsInToss from
 * mocks.ts are unaffected.
 *
 * Usage:
 *   import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
 *   import { mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks-optional";
 *   mockTds();
 *   mockAppsInToss();
 *   mockRouter();
 */

import { vi } from "vitest";
import { mockTds, mockAppsInToss } from "./mocks";

// Declared locally (not re-exported from ./mocks) — vi.mock factories below
// close over these, and vi.mock's hoisting only reliably supports referencing
// same-file top-level `mock`-prefixed bindings, not values re-exported through
// another module's binding.
export const mockNavigate = vi.fn();
export const mockLocation = { pathname: "/", search: "", state: null, key: "default" };

// ── react-router-dom ──
// Preserve actual router + override useNavigate/useLocation for assertion.
export function mockRouter() {
  vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
    return {
      ...actual,
      useNavigate: () => mockNavigate,
      useLocation: () => mockLocation,
    };
  });
}

// ── Toss Reward Ad Component ──
// TossRewardAd is a project-local component that wraps content behind ad viewing.
// In tests, render the children directly (ad always "watched").
export function mockTossRewardAd() {
  vi.mock("@/components/TossRewardAd", () => ({
    TossRewardAd: ({ children, onReward }: any) => {
      // Auto-trigger onReward in tests to unlock content
      if (onReward) setTimeout(onReward, 0);
      return children;
    },
    default: ({ children }: any) => children,
  }));
}

// ── Convenience: mock everything (TDS + apps-in-toss + router + reward ad) ──
// NOTE: importing this file already transitively imports ./mocks, so the TDS/
// apps-in-toss vi.mock calls are hoisted (and thus active) the moment ANY
// export of this file is imported, same as mockRouter()/mockTossRewardAd()
// above. These calls are kept for documentation/API-compatibility.
export function mockAll() {
  mockTds();
  mockAppsInToss();
  mockRouter();
  mockTossRewardAd();
}
