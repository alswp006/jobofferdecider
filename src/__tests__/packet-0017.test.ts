import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import { mockRouter } from "@/__tests__/__helpers__/mocks-optional";
import { ONBOARDED_KEY } from "@/lib/constants";

mockTds();
mockRouter();

import { OnboardingDialog } from "@/components/OnboardingDialog";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

function Bomb(): React.ReactElement {
  throw new Error("boom");
}

describe("온보딩 안내 + ErrorBoundary", () => {
  it("AC-1[P0]: jod:onboarded:v1이 없으면 AlertDialog가 1회 뜨고 확인 탭 시 저장된다", () => {
    expect(localStorage.getItem(ONBOARDED_KEY)).toBeNull();

    render(React.createElement(MemoryRouter, null, React.createElement(OnboardingDialog)));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    expect(localStorage.getItem(ONBOARDED_KEY)).toBe("1");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("AC-1[P0]: jod:onboarded:v1이 이미 '1'이면 다시 진입해도 뜨지 않는다", () => {
    localStorage.setItem(ONBOARDED_KEY, "1");

    render(React.createElement(MemoryRouter, null, React.createElement(OnboardingDialog)));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(ONBOARDED_KEY)).toBe("1");
  });

  it("AC-2: 다이얼로그 문구가 안내 카피를 포함한다", () => {
    render(React.createElement(MemoryRouter, null, React.createElement(OnboardingDialog)));

    expect(
      screen.getByText("연봉만이 아니라 통근·식대·복지·비금전 항목까지 합쳐 월 실질가치로 비교해요"),
    ).toBeInTheDocument();
  });

  it("AC-3[P0]: 자식이 렌더 중 throw하면 '문제가 생겼어요'와 '다시 시도' 버튼을 보여준다", () => {
    const onError = vi.fn();

    render(
      React.createElement(AppErrorBoundary, {
        onError,
        children: React.createElement(Bomb),
      }),
    );

    expect(screen.getByText("문제가 생겼어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
    expect(document.body.textContent).not.toBe("");
  });

  it("AC-3[P0]: 자식이 정상 렌더되면 '문제가 생겼어요' 없이 그대로 통과시킨다", () => {
    render(
      React.createElement(AppErrorBoundary, {
        children: React.createElement("span", null, "정상 화면"),
      }),
    );

    expect(screen.getByText("정상 화면")).toBeInTheDocument();
    expect(screen.queryByText("문제가 생겼어요")).not.toBeInTheDocument();
  });

  it("AC-4: '다시 시도' 탭 시 boundary state가 초기화되어 자식이 재렌더된다", () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error("boom");
      return React.createElement("span", null, "복구됨");
    }

    render(
      React.createElement(AppErrorBoundary, { children: React.createElement(Flaky) }),
    );

    expect(screen.getByText("문제가 생겼어요")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(screen.getByText("복구됨")).toBeInTheDocument();
    expect(screen.queryByText("문제가 생겼어요")).not.toBeInTheDocument();
  });

  it("AC-5: 두 컴포넌트 소스에 console.error 문자열이 없다", async () => {
    const fs = await import("node:fs");
    const onboardingSrc = fs.readFileSync(
      "src/components/OnboardingDialog.tsx",
      "utf-8",
    );
    const boundarySrc = fs.readFileSync(
      "src/components/AppErrorBoundary.tsx",
      "utf-8",
    );

    expect(onboardingSrc.includes("console.error")).toBe(false);
    expect(boundarySrc.includes("console.error")).toBe(false);
  });
});
