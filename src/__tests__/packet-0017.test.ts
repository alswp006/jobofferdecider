import { describe, it, expect, vi } from "vitest";
import React from "react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { screen, renderHook, waitFor, act } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { addUnlockKey, loadUnlock } from "@/lib/storage";

/**
 * TDD Red Phase Tests for packet-0017: 광고 배치 컴포넌트 + 계산 고지 최종 폴리시
 *
 * Implementation files (not yet created): src/components/AdSection.tsx,
 * src/components/CalcNotice.tsx, src/hooks/useRewardGate.ts
 */

mockTds();
mockAppsInToss();

// Stub the real AdSlot so AC-1 can assert exactly what prop AdSection passes it,
// without depending on the TossAds banner mock internals.
vi.mock("@/components/AdSlot", () => ({
  AdSlot: (props: { adGroupId: string }) =>
    React.createElement("div", {
      "data-testid": "ad-slot-stub",
      "data-ad-group-id": props.adGroupId,
    }),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

describe("광고 배치 컴포넌트 + 계산 고지 최종 폴리시", () => {
  it("AC-1: AdSection이 AdSlot을 Spacing size=24 상하로 감싸고, env의 광고 그룹 ID를 그대로 전달하며, position:fixed/absolute 겹침 스타일이 없다", async () => {
    vi.stubEnv("VITE_TOSS_AD_GROUP_ID", "test-ad-group-xyz");
    const { AdSection } = await import("@/components/AdSection");

    const { container } = renderWithRouter(React.createElement(AdSection));

    const slot = screen.getByTestId("ad-slot-stub");
    expect(slot.getAttribute("data-ad-group-id")).toBe("test-ad-group-xyz");

    const spacings = container.querySelectorAll('[data-spacing="24"]');
    expect(spacings.length).toBeGreaterThanOrEqual(2);

    const overlapping = Array.from(container.querySelectorAll<HTMLElement>("*")).filter((el) =>
      /position:\s*(fixed|absolute)/.test(el.getAttribute("style") ?? ""),
    );
    expect(overlapping.length).toBe(0);

    vi.unstubAllEnvs();
  });

  it("AC-2: CalcNotice가 '규칙 기반 계산 결과입니다'를 Paragraph.Text typography='st13' color='tertiary'로 렌더하고, 문구 상수를 단일 export한다", async () => {
    const { CalcNotice, CALC_NOTICE_TEXT } = await import("@/components/CalcNotice");

    renderWithRouter(React.createElement(CalcNotice));
    const node = screen.getByText("규칙 기반 계산 결과입니다");

    expect(node.getAttribute("data-typography")).toBe("st13");
    expect(node.getAttribute("color")).toBe("tertiary");
    expect(CALC_NOTICE_TEXT).toBe("규칙 기반 계산 결과입니다");
  });

  it("AC-3[P0]: useRewardGate(currentId, targetId)는 잠긴 상태로 시작하고, requestUnlock 성공 시 isUnlocked가 true가 되며 unlockedComparisonKeys에 영속화된다", async () => {
    const { useRewardGate } = await import("@/hooks/useRewardGate");
    const { result } = renderHook(() => useRewardGate("offer_current", "offer_target"));

    expect(result.current.isUnlocked).toBe(false);
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.requestUnlock();
    });

    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    expect(result.current.error).toBeNull();
    expect(loadUnlock().unlockedComparisonKeys).toContain("offer_current:offer_target");
  });

  it("AC-3[P0]: 이전에 언락된 쌍이면 storage에서 즉시 isUnlocked=true를 반영하고 isLoading은 false다", async () => {
    addUnlockKey("offer_a:offer_b");
    const { useRewardGate } = await import("@/hooks/useRewardGate");
    const { result } = renderHook(() => useRewardGate("offer_a", "offer_b"));

    expect(result.current.isUnlocked).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("AC-3[P0]: requestUnlock 실패 시 예외를 던지지 않고 error 문구만 노출하며 잠금 상태를 유지한다", async () => {
    const { showFullScreenAd } = await import("@apps-in-toss/web-framework");
    vi.mocked(showFullScreenAd).mockImplementationOnce((params) => {
      setTimeout(() => params.onError(new Error("ad-load-failed")), 0);
      return () => {};
    });

    const { useRewardGate } = await import("@/hooks/useRewardGate");
    const { result } = renderHook(() => useRewardGate("offer_c", "offer_d"));

    expect(() => {
      act(() => {
        result.current.requestUnlock();
      });
    }).not.toThrow();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.isUnlocked).toBe(false);
    expect(typeof result.current.error).toBe("string");
  });

  it("AC-3: retry()는 실패 후 다시 시도해 성공하면 error를 지우고 isUnlocked를 true로 만든다", async () => {
    const { showFullScreenAd } = await import("@apps-in-toss/web-framework");
    vi.mocked(showFullScreenAd).mockImplementationOnce((params) => {
      setTimeout(() => params.onError(new Error("network")), 0);
      return () => {};
    });

    const { useRewardGate } = await import("@/hooks/useRewardGate");
    const { result } = renderHook(() => useRewardGate("offer_e", "offer_f"));

    act(() => {
      result.current.requestUnlock();
    });
    await waitFor(() => expect(result.current.error).not.toBeNull());

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.isUnlocked).toBe(true));
    expect(result.current.error).toBeNull();
  });

  it("AC-4: 광고 관련 ID(adGroupId/slotId)는 코드에 하드코딩되지 않고 전부 import.meta.env를 참조한다", () => {
    const adSectionSrc = fs.readFileSync(path.join(projectRoot, "src/components/AdSection.tsx"), "utf-8");
    const rewardGateSrc = fs.readFileSync(path.join(projectRoot, "src/hooks/useRewardGate.ts"), "utf-8");

    expect(adSectionSrc).toMatch(/import\.meta\.env\.VITE_TOSS_AD_GROUP_ID/);
    expect(rewardGateSrc).toMatch(/import\.meta\.env\.VITE_TOSS_AD_SLOT_ID/);

    const hardcodedIdPattern = /(adGroupId|slotId)\s*[:=]\s*["'][^"']+["']/;
    expect(hardcodedIdPattern.test(adSectionSrc)).toBe(false);
    expect(hardcodedIdPattern.test(rewardGateSrc)).toBe(false);
  });

  it("AC-5: AdMob/AdSense 등 외부 광고 SDK import가 새 파일 어디에도 없다", () => {
    const files = [
      "src/components/AdSection.tsx",
      "src/components/CalcNotice.tsx",
      "src/hooks/useRewardGate.ts",
    ];
    const forbidden = /admob|adsense|google-mobile-ads/i;

    for (const rel of files) {
      const src = fs.readFileSync(path.join(projectRoot, rel), "utf-8");
      expect(forbidden.test(src)).toBe(false);
    }
    expect(files.length).toBe(3);
  });
});
