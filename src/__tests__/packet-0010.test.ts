import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { AXIS_ORDER, AXIS_LABELS, type Weights } from "@/lib/types";

/**
 * TDD Red Phase Tests for packet-0010: 가중치 설정 화면 (`/weights`)
 *
 * Implementation file (not yet created): src/pages/Weights.tsx
 *
 * src/hooks/useWeights.ts (owned by packet 0005) doesn't exist yet either, so it's mocked
 * here — this file only exercises Weights.tsx's own logic (row rendering, +/- clamping,
 * sum===0 guard, save wiring, wasReset fallback). Contract (per .ai-factory/packets.json #0005):
 *   useWeights() -> { isLoading, weights, save, wasReset, loadError }
 *
 * UI contract this test file establishes (Weights.tsx must match, per packets.json #0010
 * ui_requirements: ListRow per axis + Chip-like +/- control):
 *   - Each axis row: ListRow with data-testid={`weight-row-${axis}`}, AXIS_LABELS[axis] visible as text
 *   - Current value: data-testid={`weight-value-${axis}`}, text content = String(value)
 *   - Decrease control: accessible button name `${AXIS_LABELS[axis]} 낮추기`
 *   - Increase control: accessible button name `${AXIS_LABELS[axis]} 높이기`
 *   - Save CTA: accessible button name "저장하기" (SubmitFooter/FixedBottomCTA — disabled when sum===0)
 *   - Sum-zero caption (exact, per packet AC-3): "중요도를 최소 1개 이상 1점 이상으로 설정해주세요"
 *   - wasReset caption (per packets.json #0010 ui_requirements Error state):
 *       "이전 설정을 불러오지 못해 기본값으로 시작해요"
 *   - Success Toast (exact, per packet AC-4): "중요도를 저장했어요", then navigate("/")
 */

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/hooks/useWeights", () => ({
  useWeights: vi.fn(),
}));

import WeightsPage from "@/pages/Weights";
import { useWeights } from "@/hooks/useWeights";

const mockSave = vi.fn();

const baseWeights: Weights = {
  money: 5,
  remote: 5,
  commute: 5,
  growth: 5,
  culture: 5,
  stability: 5,
  updatedAt: 1700000000000,
};

function setupUseWeights(overrides: {
  weights?: Weights;
  wasReset?: boolean;
  isLoading?: boolean;
  loadError?: boolean;
} = {}) {
  vi.mocked(useWeights).mockReturnValue({
    isLoading: false,
    weights: overrides.weights ?? baseWeights,
    save: mockSave,
    wasReset: overrides.wasReset ?? false,
    loadError: overrides.loadError ?? false,
  } as unknown as ReturnType<typeof useWeights>);
}

function renderWeights() {
  return render(React.createElement(MemoryRouter, null, React.createElement(WeightsPage)));
}

function row(axis: string) {
  return screen.getByTestId(`weight-row-${axis}`);
}

function valueOf(axis: string) {
  return screen.getByTestId(`weight-value-${axis}`).textContent;
}

function decreaseButton(axis: string) {
  return screen.getByRole("button", { name: `${AXIS_LABELS[axis as keyof typeof AXIS_LABELS]} 낮추기` });
}

function increaseButton(axis: string) {
  return screen.getByRole("button", { name: `${AXIS_LABELS[axis as keyof typeof AXIS_LABELS]} 높이기` });
}

beforeEach(() => {
  mockSave.mockReset();
  mockNavigate.mockReset();
  setupUseWeights();
});

describe("가중치 설정 화면 (`/weights`)", () => {
  // ==========================================================================
  // AC-1: 6개 축 행이 AXIS_ORDER 순서로 렌더되고 각 행에 AXIS_LABELS 라벨과 현재 값이 표시
  // ==========================================================================
  describe("AC-1: 6축 행 렌더 순서 + 라벨/값 표시", () => {
    it("AXIS_ORDER 순서대로 6개 행이 DOM에 나타난다", () => {
      renderWeights();

      const testIds = AXIS_ORDER.map((axis) => `weight-row-${axis}`);
      const rendered = testIds.map((id) => screen.getByTestId(id));

      expect(rendered).toHaveLength(6);
      // DOM order matches AXIS_ORDER order (document position comparison)
      for (let i = 0; i < rendered.length - 1; i++) {
        // eslint-disable-next-line no-bitwise
        expect(rendered[i].compareDocumentPosition(rendered[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    });

    it("각 행에 AXIS_LABELS 라벨과 현재 값이 표시된다", () => {
      const weights: Weights = { money: 9, remote: 3, commute: 2, growth: 7, culture: 6, stability: 4, updatedAt: 1 };
      setupUseWeights({ weights });
      renderWeights();

      expect(within(row("money")).getByText("실수령")).toBeInTheDocument();
      expect(valueOf("money")).toBe("9");
      expect(within(row("commute")).getByText("통근")).toBeInTheDocument();
      expect(valueOf("commute")).toBe("2");
      expect(valueOf("culture")).toBe("6");
    });
  });

  // ==========================================================================
  // AC-2: 값 조절 시 0 미만/10 초과로 내려가거나 올라가지 않음(정수만)
  // ==========================================================================
  describe("AC-2: 값 조절 범위 0~10 클램프", () => {
    it("값이 0인 축에서 낮추기를 눌러도 0 밑으로 내려가지 않는다", () => {
      const weights: Weights = { ...baseWeights, money: 0 };
      setupUseWeights({ weights });
      renderWeights();

      fireEvent.click(decreaseButton("money"));
      fireEvent.click(decreaseButton("money"));

      expect(valueOf("money")).toBe("0");
    });

    it("값이 10인 축에서 높이기를 눌러도 10 위로 올라가지 않는다", () => {
      const weights: Weights = { ...baseWeights, remote: 10 };
      setupUseWeights({ weights });
      renderWeights();

      fireEvent.click(increaseButton("remote"));
      fireEvent.click(increaseButton("remote"));

      expect(valueOf("remote")).toBe("10");
    });

    it("높이기/낮추기를 누르면 정수 1단위로 값이 바뀐다", () => {
      renderWeights();

      fireEvent.click(increaseButton("growth"));
      expect(valueOf("growth")).toBe("6");

      fireEvent.click(decreaseButton("growth"));
      fireEvent.click(decreaseButton("growth"));
      expect(valueOf("growth")).toBe("4");
    });
  });

  // ==========================================================================
  // AC-3: 6축 합이 0이면 저장 Button disabled + 안내 캡션 표시
  // ==========================================================================
  describe("AC-3: 6축 합 0 → 저장 disabled + 캡션", () => {
    it("모든 축이 0이면 저장 Button이 disabled고 안내 캡션이 표시된다", () => {
      const weights: Weights = { money: 0, remote: 0, commute: 0, growth: 0, culture: 0, stability: 0, updatedAt: 0 };
      setupUseWeights({ weights });
      renderWeights();

      const saveButton = screen.getByRole("button", { name: "저장하기" });
      expect(saveButton).toBeDisabled();
      expect(screen.getByText("중요도를 최소 1개 이상 1점 이상으로 설정해주세요")).toBeInTheDocument();

      fireEvent.click(saveButton);
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("최소 1개 축이 1 이상이면 저장 Button이 활성화되고 캡션이 사라진다", () => {
      const weights: Weights = { money: 1, remote: 0, commute: 0, growth: 0, culture: 0, stability: 0, updatedAt: 0 };
      setupUseWeights({ weights });
      renderWeights();

      expect(screen.getByRole("button", { name: "저장하기" })).not.toBeDisabled();
      expect(screen.queryByText("중요도를 최소 1개 이상 1점 이상으로 설정해주세요")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // AC-4: 저장 성공 시 Toast '중요도를 저장했어요' 표시 후 navigate('/')
  // ==========================================================================
  describe("AC-4: 저장 성공 → Toast + navigate('/')", () => {
    it("조절한 값 그대로 save()가 호출되고 성공 시 Toast와 navigate('/')가 실행된다", () => {
      mockSave.mockReturnValue({ ok: true });
      renderWeights();

      // money: 5 -> 9 (+4), commute: 5 -> 2 (-3)
      fireEvent.click(increaseButton("money"));
      fireEvent.click(increaseButton("money"));
      fireEvent.click(increaseButton("money"));
      fireEvent.click(increaseButton("money"));
      fireEvent.click(decreaseButton("commute"));
      fireEvent.click(decreaseButton("commute"));
      fireEvent.click(decreaseButton("commute"));

      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ money: 9, commute: 2, remote: 5, growth: 5, culture: 5, stability: 5 }),
      );
      expect(screen.getByText("중요도를 저장했어요")).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("저장 실패(SaveResult.ok=false) 시 navigate가 호출되지 않는다", () => {
      mockSave.mockReturnValue({ ok: false, error: "저장 공간이 부족해요. 오퍼를 삭제 후 다시 시도해주세요." });
      renderWeights();

      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-5: 기존 저장값이 손상되어 wasReset=true면 기본값 5로 렌더 + 안내 캡션 노출
  // ==========================================================================
  describe("AC-5: wasReset=true → 기본값 5 렌더 + 안내 캡션", () => {
    it("wasReset=true면 6축 모두 값 5로 렌더되고 기본값 안내 캡션이 노출된다", () => {
      setupUseWeights({ wasReset: true, weights: { ...baseWeights } });
      renderWeights();

      for (const axis of AXIS_ORDER) {
        expect(valueOf(axis)).toBe("5");
      }
      expect(screen.getByText("이전 설정을 불러오지 못해 기본값으로 시작해요")).toBeInTheDocument();
    });

    it("wasReset=false면 기본값 안내 캡션이 노출되지 않는다", () => {
      setupUseWeights({ wasReset: false });
      renderWeights();

      expect(screen.queryByText("이전 설정을 불러오지 못해 기본값으로 시작해요")).not.toBeInTheDocument();
    });
  });
});
