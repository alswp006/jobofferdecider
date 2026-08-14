import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { mockTds } from "@/__tests__/__helpers__/mocks";

mockTds();

// html-to-image is mocked so we control resolve/reject per test.
const toPngMock = vi.fn();
vi.mock("html-to-image", () => ({
  toPng: (...args: unknown[]) => toPngMock(...args),
}));

// @ts-ignore TDD red phase — src/components/SaveResultImage.tsx is not implemented yet
import SaveResultImage from "@/components/SaveResultImage";

const SOURCE_PATH = path.resolve(__dirname, "../components/SaveResultImage.tsx");

function renderComponent(offerId = "o-1") {
  const ref = { current: document.createElement("div") } as React.RefObject<HTMLElement>;
  render(React.createElement(SaveResultImage, { targetRef: ref, offerId }));
  return ref;
}

describe("결과 이미지 저장 (F7) — SaveResultImage", () => {
  beforeEach(() => {
    toPngMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-1[P0]: 버튼 탭 시 targetRef DOM을 PNG dataURL로 변환하고 파일명이 joboffer-result-<offerId>.png 형식이다", async () => {
    toPngMock.mockResolvedValue("data:image/png;base64,AAA");

    const captured: { anchor: HTMLAnchorElement | null } = { anchor: null };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: any) => {
      if (tagName === "a") {
        const anchor = originalCreateElement("a") as HTMLAnchorElement;
        const clickSpy = vi.fn();
        Object.defineProperty(anchor, "click", { value: clickSpy, configurable: true });
        captured.anchor = anchor;
        return anchor;
      }
      return originalCreateElement(tagName, options);
    });

    const ref = renderComponent("o-1");

    fireEvent.click(screen.getByRole("button", { name: /이미지로 저장/ }));

    await waitFor(() => expect(toPngMock).toHaveBeenCalledTimes(1));

    expect(toPngMock.mock.calls[0][0]).toBe(ref.current);
    await waitFor(() => expect(captured.anchor?.download).toBe("joboffer-result-o-1.png"));
    expect(captured.anchor?.click).toHaveBeenCalledTimes(1);
  });

  it("AC-2[P0]: 저장 성공 시 Toast '이미지를 저장했어요'가 표시된다", async () => {
    toPngMock.mockResolvedValue("data:image/png;base64,AAA");

    renderComponent("o-2");
    fireEvent.click(screen.getByRole("button", { name: /이미지로 저장/ }));

    await waitFor(() => {
      expect(screen.getByText("이미지를 저장했어요")).toBeInTheDocument();
    });
  });

  it("AC-3: download 미지원 환경에서는 BottomSheet로 이미지 미리보기와 '길게 눌러 저장해주세요' 안내가 노출된다", async () => {
    toPngMock.mockResolvedValue("data:image/png;base64,BBB");

    // Simulate an environment where <a> has no `download` support at all.
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: any) => {
      if (tagName === "a") {
        return { click: vi.fn() } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName, options);
    });

    renderComponent("o-3");
    fireEvent.click(screen.getByRole("button", { name: /이미지로 저장/ }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText(/길게 눌러 저장해주세요/)).toBeInTheDocument();
    const preview = screen.getByRole("img");
    expect(preview.getAttribute("src")).toBe("data:image/png;base64,BBB");
  });

  it("AC-4[P0]: 변환 실패 시 Toast '이미지를 만들지 못했어요. 다시 시도해주세요'가 뜨고 예외가 전파되지 않는다", async () => {
    toPngMock.mockRejectedValue(new Error("canvas render failed"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderComponent("o-4");

    expect(() => {
      fireEvent.click(screen.getByRole("button", { name: /이미지로 저장/ }));
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText("이미지를 만들지 못했어요. 다시 시도해주세요")).toBeInTheDocument();
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("AC-5: 소스에 window.open / window.location.href / console.error 문자열이 없다", () => {
    const sourceCode = fs.readFileSync(SOURCE_PATH, "utf-8");

    expect(sourceCode).not.toMatch(/window\.open\s*\(/);
    expect(sourceCode).not.toMatch(/window\.location\.href/);
    expect(sourceCode).not.toMatch(/console\.error/);
  });

  it("AC-1: offerId가 다르면 파일명도 달라진다", async () => {
    toPngMock.mockResolvedValue("data:image/png;base64,CCC");

    const captured: { anchor: HTMLAnchorElement | null } = { anchor: null };
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string, options?: any) => {
      if (tagName === "a") {
        const anchor = originalCreateElement("a") as HTMLAnchorElement;
        Object.defineProperty(anchor, "click", { value: vi.fn(), configurable: true });
        captured.anchor = anchor;
        return anchor;
      }
      return originalCreateElement(tagName, options);
    });

    renderComponent("offer-xyz-99");
    fireEvent.click(screen.getByRole("button", { name: /이미지로 저장/ }));

    await waitFor(() => expect(captured.anchor?.download).toBe("joboffer-result-offer-xyz-99.png"));
  });
});
