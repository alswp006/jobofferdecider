import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

/**
 * TDD Red Phase Tests for packet-0009: 점수 선택 컴포넌트 (성장성·조직문화·안정성)
 *
 * Implementation file (not yet created): src/components/ScoreSelector.tsx
 * ScoreSelector props: { label: string; value: number; onChange: (v: number) => void }
 *
 * NOTE on the shared TDS mock (see __helpers__/mocks.ts):
 *   Chip: ({ children, selected, onClick }) => <button role="button" aria-pressed={selected} onClick>{children}</button>
 * The mock only forwards `selected`/`onClick`/`children` — any style/testid props passed
 * directly to <Chip> are swallowed. Because of this, AC-3 (44x44 touch target) and the
 * TDS Spacing usage check (AC-5) must be verifiable on a wrapper element that ScoreSelector
 * itself renders around each <Chip> — e.g. a `data-testid="score-chip-{n}"` container with
 * inline minWidth/minHeight, and <Spacing> elements (which DO render, as data-spacing divs)
 * between chips.
 */

mockTds();
mockAppsInToss();

import { ScoreSelector } from "@/components/ScoreSelector";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

describe("점수 선택 컴포넌트 (성장성·조직문화·안정성)", () => {
  // ==========================================================================
  // AC-1[P0]: Props shape { label, value, onChange } + renders 1~5 Chip 5개
  // ==========================================================================
  describe("AC-1[P0]: props & 5 chips rendered", () => {
    it("renders the label text and exactly 5 chips labeled 1~5", () => {
      render(
        React.createElement(ScoreSelector, {
          label: "성장성",
          value: 3,
          onChange: vi.fn(),
        }),
      );

      expect(screen.getByText("성장성")).toBeInTheDocument();

      const chips = screen.getAllByRole("button");
      expect(chips).toHaveLength(5);
      expect(chips.map((c) => c.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    });

    it("reflects the `value` prop as the currently selected chip (aria-pressed)", () => {
      render(
        React.createElement(ScoreSelector, {
          label: "조직문화",
          value: 4,
          onChange: vi.fn(),
        }),
      );

      const chips = screen.getAllByRole("button");
      expect(chips[3]).toHaveAttribute("aria-pressed", "true");
      expect(chips[0]).toHaveAttribute("aria-pressed", "false");
    });
  });

  // ==========================================================================
  // AC-2: 선택된 Chip만 활성(selected/aria-pressed=true), 나머지는 outlined(false)
  // ==========================================================================
  describe("AC-2: exactly one chip is active, rest are outlined", () => {
    it("marks only the chip matching `value` as pressed=true, all others false", () => {
      render(
        React.createElement(ScoreSelector, {
          label: "안정성",
          value: 2,
          onChange: vi.fn(),
        }),
      );

      const chips = screen.getAllByRole("button");
      const pressedStates = chips.map((c) => c.getAttribute("aria-pressed"));

      expect(pressedStates).toEqual(["false", "true", "false", "false", "false"]);
      expect(pressedStates.filter((s) => s === "true")).toHaveLength(1);
    });
  });

  // ==========================================================================
  // AC-3: 터치 타깃 최소 44x44px
  // ==========================================================================
  describe("AC-3: 44x44px minimum touch target per chip", () => {
    it("each score-chip wrapper has inline minWidth/minHeight >= 44px", () => {
      render(
        React.createElement(ScoreSelector, {
          label: "성장성",
          value: 1,
          onChange: vi.fn(),
        }),
      );

      for (let n = 1; n <= 5; n++) {
        const wrapper = screen.getByTestId(`score-chip-${n}`);
        const minWidth = parseInt(wrapper.style.minWidth || "0", 10);
        const minHeight = parseInt(wrapper.style.minHeight || "0", 10);
        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      }
    });
  });

  // ==========================================================================
  // AC-4[P0]: Chip 탭 시 onChange(n) 호출 + tickWeak 햅틱
  // ==========================================================================
  describe("AC-4[P0]: tap triggers onChange + tickWeak haptic", () => {
    it("clicking the 5th chip calls onChange(5) exactly once", () => {
      const onChange = vi.fn();
      render(
        React.createElement(ScoreSelector, {
          label: "성장성",
          value: 1,
          onChange,
        }),
      );

      const chips = screen.getAllByRole("button");
      chips[4].click();

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(5);
    });

    it("clicking a chip fires generateHapticFeedback({ type: 'tickWeak' })", () => {
      render(
        React.createElement(ScoreSelector, {
          label: "성장성",
          value: 1,
          onChange: vi.fn(),
        }),
      );

      const chips = screen.getAllByRole("button");
      chips[2].click();

      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
    });
  });

  // ==========================================================================
  // AC-5: HEX 0개, 간격은 TDS Spacing(size)만 사용
  // ==========================================================================
  describe("AC-5: no hardcoded HEX colors, spacing via TDS Spacing", () => {
    it("renders with zero hardcoded HEX color values in the DOM", () => {
      const { container } = render(
        React.createElement(ScoreSelector, {
          label: "성장성",
          value: 1,
          onChange: vi.fn(),
        }),
      );

      const html = container.innerHTML;
      expect(/#[0-9a-fA-F]{3,8}\b/.test(html)).toBe(false);
    });

    it("uses TDS Spacing components (with a size prop) between the 5 chips, not inline margin", () => {
      const { container } = render(
        React.createElement(ScoreSelector, {
          label: "성장성",
          value: 1,
          onChange: vi.fn(),
        }),
      );

      const spacers = container.querySelectorAll("[data-spacing]");
      expect(spacers.length).toBeGreaterThanOrEqual(4);
      spacers.forEach((s) => {
        expect(s.getAttribute("data-spacing")).not.toBeNull();
      });

      const chips = screen.getAllByRole("button");
      chips.forEach((chip) => {
        expect(chip.style.margin).toBe("");
      });
    });
  });
});
