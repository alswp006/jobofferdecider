import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

import { generateHapticFeedback } from "@apps-in-toss/web-framework";
// @ts-expect-error — RED phase: src/components/WeightSlider.tsx does not exist yet (Coder creates it)
import { WeightSlider } from "@/components/WeightSlider";

function renderSlider(props: Partial<React.ComponentProps<typeof WeightSlider>> = {}) {
  const onChange = props.onChange ?? vi.fn();
  const utils = render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(WeightSlider, {
        label: "돈",
        value: 50,
        onChange,
        ...props,
      }),
    ),
  );
  return { ...utils, onChange };
}

describe("WeightSlider 컴포넌트", () => {
  it("AC-1[P0]: renders with label/value props and calls onChange with a new integer value on change", () => {
    const onChange = vi.fn();
    renderSlider({ label: "돈", value: 50, onChange });

    const input = screen.getByRole("slider") as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("50");

    fireEvent.change(input, { target: { value: "65" } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(65);
    expect(Number.isInteger(onChange.mock.calls[0][0])).toBe(true);
  });

  it("AC-1[P0]: does not call onChange on initial render", () => {
    const onChange = vi.fn();
    renderSlider({ label: "성장성", value: 30, onChange });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("AC-2: input[type=range] has min=0, max=100, step=5 and a 44px+ thumb touch target", () => {
    renderSlider({ label: "워라밸", value: 40 });
    const input = screen.getByRole("slider") as HTMLInputElement;

    expect(input.getAttribute("type")).toBe("range");
    expect(input.getAttribute("min")).toBe("0");
    expect(input.getAttribute("max")).toBe("100");
    expect(input.getAttribute("step")).toBe("5");

    // thumb height must be >= 44px — verified via CSS source (jsdom can't measure pseudo-element geometry)
    expect(existsSync("src/components/WeightSlider.css")).toBe(true);
    const css = readFileSync("src/components/WeightSlider.css", "utf-8");
    const thumbBlockMatch = css.match(/::-webkit-slider-thumb\s*{([^}]*)}/);
    expect(thumbBlockMatch).not.toBeNull();
    const heightMatch = thumbBlockMatch![1].match(/height:\s*(\d+)px/);
    expect(heightMatch).not.toBeNull();
    expect(Number(heightMatch![1])).toBeGreaterThanOrEqual(44);
  });

  it("AC-3: source contains zero HEX color literals; only var(--tds-color-*) is used for color", () => {
    const tsx = readFileSync("src/components/WeightSlider.tsx", "utf-8");
    const css = readFileSync("src/components/WeightSlider.css", "utf-8");
    const combined = tsx + css;

    const hexMatches = combined.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexMatches).toEqual([]);

    const colorPropertyLines = combined
      .split("\n")
      .filter((line) => /\b(color|background(-color)?|border(-color)?|fill|stroke)\s*:/.test(line));
    for (const line of colorPropertyLines) {
      if (/var\(--tds-color-/.test(line)) continue;
      // lines that declare a color property without any hardcoded literal value are fine
      expect(/#[0-9a-fA-F]{3,8}/.test(line)).toBe(false);
    }
  });

  it("AC-4: label and current value are rendered via TDS Paragraph.Text", () => {
    renderSlider({ label: "안정성", value: 75 });

    const label = screen.getByText("안정성");
    const value = screen.getByText("75");

    expect(label.getAttribute("data-typography")).toBeTruthy();
    expect(value.getAttribute("data-typography")).toBeTruthy();
  });

  it("AC-5[P0]: calls generateHapticFeedback({type:'tickWeak'}) when the value changes", () => {
    renderSlider({ label: "조직문화", value: 20 });
    const input = screen.getByRole("slider") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "35" } });

    expect(generateHapticFeedback).toHaveBeenCalledTimes(1);
    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
  });

  it("AC-5: does not throw when generateHapticFeedback rejects/throws (SDK guard)", () => {
    const hapticMock = generateHapticFeedback as unknown as ReturnType<typeof vi.fn>;
    hapticMock.mockImplementationOnce(() => {
      throw new Error("no native bridge");
    });
    const onChange = vi.fn();
    renderSlider({ label: "통근 편의", value: 10, onChange });
    const input = screen.getByRole("slider") as HTMLInputElement;

    expect(() => fireEvent.change(input, { target: { value: "15" } })).not.toThrow();
    expect(onChange).toHaveBeenCalledWith(15);
  });
});
