import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import {
  STORAGE_KEYS,
  DEFAULT_WEIGHTS,
  AXIS_ORDER,
  AXIS_LABELS,
  VERDICT_LABELS,
  type ScoreResult,
} from "@/lib/types";

/**
 * TDD Red Phase Tests for packet-0013: 결과 이미지 저장 유틸 + 저장 버튼
 *
 * Implementation files (not yet created):
 *   - src/lib/shareImage.ts        saveResultImage(result, companyNames): Promise<boolean>
 *   - src/components/SaveImageButton.tsx
 *       Props: { result: ScoreResult; companyNames: { current: string; target: string } }
 *
 * saveResultImage draws판정 라벨/총점/월 차액/6축 점수 onto a canvas 2d context,
 * converts it to a PNG Blob (canvas.toBlob), and triggers a same-origin blob: download
 * via a temporary <a download> element — never window.open / location.href.
 * It resolves to `true` on success and `false` (never throws) if getContext or toBlob fail.
 * No image data is ever written to localStorage.
 */

mockTds();
mockAppsInToss();

import { saveResultImage } from "@/lib/shareImage";
import { SaveImageButton } from "@/components/SaveImageButton";

// ── shared fixtures ──
const mockResult: ScoreResult = {
  currentOfferId: "cur-1",
  targetOfferId: "tgt-1",
  axes: AXIS_ORDER.map((axis) => ({
    axis,
    label: AXIS_LABELS[axis],
    rawCurrent: 50,
    rawTarget: 60,
    normCurrent: 45,
    normTarget: 55,
    weight: 5,
    weightedCurrent: 225,
    weightedTarget: 275,
  })),
  totalCurrent: 68,
  totalTarget: 74,
  gap: 6,
  money: {
    currentMonthlyNetWon: 3200000,
    targetMonthlyNetWon: 3500000,
    diffMonthlyWon: 300000,
    diffYearlyWon: 3600000,
    currentTaxWon: 400000,
    targetTaxWon: 450000,
  },
  verdict: "lean_move",
  negotiationPoints: ["포인트1", "포인트2", "포인트3"],
  computedAt: 1234567890,
};

const companyNames = { current: "현재직장", target: "네이버" };

function makeCtxStub() {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    measureText: vi.fn(() => ({ width: 10 })),
    font: "",
    fillStyle: "",
    strokeStyle: "",
    textAlign: "left",
    textBaseline: "top",
    lineWidth: 1,
  };
}

let ctxStub: ReturnType<typeof makeCtxStub>;
let toBlobMock: ReturnType<typeof vi.fn>;
let getContextSpy: ReturnType<typeof spyOnGetContext>;

function spyOnGetContext() {
  return vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ctxStub as unknown as CanvasRenderingContext2D);
}

beforeEach(() => {
  ctxStub = makeCtxStub();
  getContextSpy = spyOnGetContext();

  toBlobMock = vi.fn((cb: (b: Blob | null) => void) => {
    cb(new Blob(["fake-png-bytes"], { type: "image/png" }));
  });
  // jsdom does not implement toBlob — install our own
  HTMLCanvasElement.prototype.toBlob = toBlobMock as unknown as HTMLCanvasElement["toBlob"];

  if (!("createObjectURL" in URL)) {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn();
  }
  if (!("revokeObjectURL" in URL)) {
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
  }
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url-1234");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("결과 이미지 저장 유틸 + 저장 버튼", () => {
  // ==========================================================================
  // AC-1[P0]: canvas 2d로 판정 라벨·총점·월 차액·6축 점수를 그려 PNG Blob 생성
  // ==========================================================================
  it("AC-1[P0]: draws verdict label, totals, monthly diff, and all 6 axis labels onto a 2d canvas and produces a PNG blob", async () => {
    const ok = await saveResultImage(mockResult, companyNames);

    expect(ok).toBe(true);
    expect(getContextSpy).toHaveBeenCalledWith("2d");

    const drawnText = ctxStub.fillText.mock.calls.map((c) => String(c[0])).join(" | ");
    expect(drawnText).toContain(VERDICT_LABELS[mockResult.verdict]);
    expect(drawnText).toContain(String(mockResult.totalTarget));
    for (const axis of AXIS_ORDER) {
      expect(drawnText).toContain(AXIS_LABELS[axis]);
    }
    expect(drawnText).toMatch(/300,?000/);
    expect(toBlobMock).toHaveBeenCalledTimes(1);
  });

  // ==========================================================================
  // AC-2[P0]: 저장 버튼 탭 → blob: 다운로드 트리거, window.open/location.href 0건
  // ==========================================================================
  it("AC-2[P0]: triggers a same-origin blob download named 이직결정_{targetCompany}.png without window.open", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const createElSpy = vi.spyOn(document, "createElement");

    const ok = await saveResultImage(mockResult, companyNames);

    expect(ok).toBe(true);
    const anchor = createElSpy.mock.results
      .map((r) => r.value)
      .find((el): el is HTMLAnchorElement => el instanceof HTMLAnchorElement);

    expect(anchor).toBeDefined();
    expect(anchor!.download).toBe(`이직결정_${companyNames.target}.png`);
    expect(anchor!.href).toMatch(/^blob:/);
    expect(openSpy).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // AC-3[P0]: 캔버스 컨텍스트 획득 실패 시 throw/console.error 없이 실패 반환
  // ==========================================================================
  it("AC-3[P0]: resolves to false without throwing or logging console.error when getContext fails", async () => {
    getContextSpy.mockReturnValueOnce(null as unknown as CanvasRenderingContext2D);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    let ok: boolean | undefined;
    await expect(
      (async () => {
        ok = await saveResultImage(mockResult, companyNames);
      })(),
    ).resolves.not.toThrow();

    expect(ok).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // AC-3[P0] (버튼): toBlob이 null이면 Toast로 실패 안내
  // ==========================================================================
  it("AC-3[P0]: shows a Toast '이미지를 저장하지 못했어요. 다시 시도해주세요.' when canvas toBlob returns null, without crashing", async () => {
    toBlobMock.mockImplementationOnce((cb: (b: Blob | null) => void) => cb(null));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(React.createElement(SaveImageButton, { result: mockResult, companyNames }));
    const button = screen.getByRole("button");
    button.click();

    const toast = await screen.findByText("이미지를 저장하지 못했어요. 다시 시도해주세요.");
    expect(toast).toBeInTheDocument();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  // ==========================================================================
  // AC-4[P0]: 이미지 데이터가 localStorage에 기록되지 않음
  // ==========================================================================
  it("AC-4[P0]: does not write any image data into localStorage — all 4 storage keys stay byte-identical", async () => {
    seedLocalStorage({
      [STORAGE_KEYS.OFFERS]: [{ id: "o1" }],
      [STORAGE_KEYS.WEIGHTS]: DEFAULT_WEIGHTS,
      [STORAGE_KEYS.UNLOCK]: { unlockedComparisonKeys: [], updatedAt: 0 },
      [STORAGE_KEYS.META]: { schemaVersion: 1, calcNoticeAcknowledged: true, onboardedAt: 0 },
    });
    const before = Object.fromEntries(
      Object.values(STORAGE_KEYS).map((k) => [k, localStorage.getItem(k)]),
    );

    await saveResultImage(mockResult, companyNames);

    expect(localStorage.length).toBe(4);
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(localStorage.getItem(key)).toBe(before[key]);
    }
  });

  // ==========================================================================
  // AC-5[P1]: TDS Button variant='weak' display='block', height >= 48px
  // ==========================================================================
  it("AC-5[P1]: renders as a TDS Button with variant='weak', display='block', and inline height/min-height >= 48px", () => {
    render(React.createElement(SaveImageButton, { result: mockResult, companyNames }));

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("variant", "weak");
    expect(button).toHaveAttribute("display", "block");

    const styleAttr = button.getAttribute("style") ?? "";
    const heightMatch = styleAttr.match(/(?:min-height|height):\s*(\d+)px/);
    expect(heightMatch).not.toBeNull();
    expect(Number(heightMatch![1])).toBeGreaterThanOrEqual(48);
  });
});
