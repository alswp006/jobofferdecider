import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { vi } from "vitest";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { STORAGE_KEY } from "@/lib/constants";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import type { AppState, CompanyProfile } from "@/lib/types";
import { parseWon } from "@/lib/form";

mockTds();
mockAppsInToss();

// react-router-dom: keep real useParams/useLocation (routing determines the mode),
// only override useNavigate so we can assert on it.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import CompanyForm from "@/pages/CompanyForm";

function renderAt(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/company/current", element: React.createElement(CompanyForm) }),
        React.createElement(Route, { path: "/company/offer/new", element: React.createElement(CompanyForm) }),
        React.createElement(Route, { path: "/company/offer/:id", element: React.createElement(CompanyForm) }),
      ),
    ),
  );
}

// Locates the <input> rendered by the mocked TDS TextField sibling to its <label>text.
function getInputNear(container: HTMLElement, labelText: string): HTMLInputElement {
  const label = within(container).getByText(labelText, { selector: "label" });
  const input = label.parentElement?.querySelector("input");
  if (!input) throw new Error(`입력 필드를 찾을 수 없어요: ${labelText}`);
  return input as HTMLInputElement;
}

const VALID_NUMERIC_VALUES = [
  "60000000", // baseSalary
  "6000000", // bonusPerYear
  "2", // remoteDaysPerWeek
  "40", // commuteMinutesOneWay
  "3000", // commuteCostPerDay
  "9000", // lunchCostPerDay
  "100000", // mealSupportPerMonth
  "1200000", // welfarePointsPerYear
];

function fillValidForm(container: HTMLElement, name = "테스트회사") {
  fireEvent.change(getInputNear(container, "회사명"), { target: { value: name } });

  const numericInputs = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]'),
  );
  numericInputs.forEach((input, i) => {
    fireEvent.change(input, { target: { value: VALID_NUMERIC_VALUES[i] } });
  });
}

function seedOffer(overrides: Partial<CompanyProfile> = {}): CompanyProfile {
  return {
    id: "o-1",
    name: "B사",
    baseSalary: 70_000_000,
    bonusPerYear: 5_000_000,
    remoteDaysPerWeek: 1,
    commuteMinutesOneWay: 30,
    commuteCostPerDay: 4_000,
    lunchCostPerDay: 8_000,
    mealSupportPerMonth: 150_000,
    welfarePointsPerYear: 1_000_000,
    ratings: { growth: 4, workLife: 3, stability: 3, culture: 4, commuteEase: 3 },
    updatedAt: "2026-08-10T00:00:00.000Z",
    ...overrides,
  };
}

function seedState(overrides: Partial<AppState> = {}): AppState {
  return {
    version: 1,
    current: null,
    offers: [],
    weights: DEFAULT_WEIGHTS,
    unlockedOfferIds: [],
    ...overrides,
  };
}

describe("회사 정보 입력 페이지 (S2)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  describe("AC-1[P0]: 모드별 타이틀", () => {
    it("should render '현재 직장' at /company/current", () => {
      renderAt("/company/current");
      expect(screen.getByText("현재 직장")).toBeInTheDocument();
      expect(screen.queryByText("제안받은 회사")).not.toBeInTheDocument();
    });

    it("should render '제안받은 회사' at /company/offer/new", () => {
      renderAt("/company/offer/new");
      expect(screen.getByText("제안받은 회사")).toBeInTheDocument();
      expect(screen.queryByText("현재 직장")).not.toBeInTheDocument();
    });
  });

  describe("AC-2[P0]: 회사명 미입력 시 저장 거부", () => {
    it("should show hasError help text and block navigation when name is empty", () => {
      const { container } = renderAt("/company/offer/new");

      const numericInputs = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]'),
      );
      numericInputs.forEach((input, i) => {
        fireEvent.change(input, { target: { value: VALID_NUMERIC_VALUES[i] } });
      });

      fireEvent.click(screen.getByRole("button", { name: /저장/ }));

      expect(screen.getByText("1~20자로 적어주세요")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("should not persist state to localStorage when validation fails", () => {
      const { container } = renderAt("/company/current");

      const numericInputs = Array.from(
        container.querySelectorAll<HTMLInputElement>('input[inputmode="numeric"]'),
      );
      numericInputs.forEach((input, i) => {
        fireEvent.change(input, { target: { value: VALID_NUMERIC_VALUES[i] } });
      });
      // name left empty

      fireEvent.click(screen.getByRole("button", { name: /저장/ }));

      const raw = localStorage.getItem(STORAGE_KEY);
      const stored: AppState | null = raw ? JSON.parse(raw) : null;
      expect(stored === null || stored.current === null).toBe(true);
    });
  });

  describe("AC-3[P0]: 저장 후 홈 이동 및 재진입 시 복원", () => {
    it("should persist valid input under state.current and navigate to '/'", () => {
      const { container } = renderAt("/company/current");

      fillValidForm(container, "테스트회사");
      fireEvent.click(screen.getByRole("button", { name: /저장/ }));

      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigate.mock.calls[0][0]).toBe("/");

      const stored: AppState = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.current?.id).toBe("current");
      expect(stored.current?.name).toBe("테스트회사");
      expect(stored.current?.baseSalary).toBe(60_000_000);
      expect(stored.current?.bonusPerYear).toBe(6_000_000);
    });

    it("should restore previously saved values from localStorage on re-entry", () => {
      const { container: firstContainer, unmount } = renderAt("/company/current");
      fillValidForm(firstContainer, "복원회사");
      fireEvent.click(screen.getByRole("button", { name: /저장/ }));
      unmount();

      const { container } = renderAt("/company/current");

      const nameInput = getInputNear(container, "회사명");
      expect(nameInput.value).toBe("복원회사");

      const baseSalaryInput = container.querySelectorAll<HTMLInputElement>(
        'input[inputmode="numeric"]',
      )[0];
      expect(parseWon(baseSalaryInput.value)).toBe(60_000_000);
    });
  });

  describe("AC-4: 숫자 필드 속성 & 비금전 평가 Chip", () => {
    it("should render exactly 8 numeric text fields and 25 selectable rating chips", () => {
      const { container } = renderAt("/company/offer/new");

      const numericInputs = container.querySelectorAll<HTMLInputElement>(
        'input[inputmode="numeric"]',
      );
      expect(numericInputs.length).toBe(8);
      numericInputs.forEach((input) => {
        expect(input.getAttribute("type")).toBe("text");
      });

      const chips = container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]");
      expect(chips.length).toBe(25);

      const selectedByDefault = Array.from(chips).filter(
        (c) => c.getAttribute("aria-pressed") === "true",
      );
      // 5 rating rows default to 3 -> exactly one selected chip per row
      expect(selectedByDefault.length).toBe(5);

      fireEvent.click(chips[0]);
      expect(chips[0].getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("AC-5[P0]: 오퍼 편집 모드 삭제", () => {
    it("should show an AlertDialog when the delete button is tapped in offer edit mode", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState({ offers: [seedOffer()] })));
      renderAt("/company/offer/o-1");

      fireEvent.click(screen.getByRole("button", { name: "삭제" }));

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("should delete the offer from localStorage and navigate home on confirm", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState({ offers: [seedOffer()] })));
      renderAt("/company/offer/o-1");

      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
      const dialog = screen.getByRole("alertdialog");
      fireEvent.click(within(dialog).getByRole("button", { name: /삭제/ }));

      const stored: AppState = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
      expect(stored.offers.find((o) => o.id === "o-1")).toBeUndefined();
      expect(mockNavigate).toHaveBeenCalled();
      expect(mockNavigate.mock.calls[0][0]).toBe("/");
    });
  });
});
