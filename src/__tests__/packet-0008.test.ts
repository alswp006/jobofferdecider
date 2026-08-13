import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mocks";
import type { Offer } from "@/lib/types";

/**
 * TDD Red Phase Tests for packet-0008: 직장·오퍼 입력 폼 화면 (`/offer/new`, `/offer/:id/edit`)
 *
 * Implementation file (not yet created): src/pages/OfferForm.tsx
 *
 * src/hooks/useOffers.ts (owned by packet 0005) doesn't exist yet either, so it's mocked
 * here — this file only exercises OfferForm's own logic (default kind, field validation,
 * save/remove wiring, navigation). Contract (per .ai-factory/packets.json #0005):
 *   useOffers() -> { isLoading, offers, current, save, remove, refresh, loadError }
 *
 * Query strategy: the shared TDS mock renders TextField's `label` as a plain sibling
 * <label>, with no htmlFor/id association to the <input> — getByLabelText cannot resolve
 * it. Each TextField's underlying <input> is expected to carry `name` equal to the Offer
 * field key (companyName, baseSalaryManwon, ...); tests query via
 * `input[name="..."]`, which is implementation-agnostic and independent of copy/label text.
 *
 * NOTE: the shared TDS mock was missing `FixedBottomCTA` (used by src/components/BottomCTA.tsx's
 * SubmitFooter) and `Top`'s `right` slot (both real, documented TDS props per
 * .ai-factory/tds-essential.txt) — both were added to __helpers__/mocks.ts so SubmitFooter
 * and Top's right-side 삭제 button actually render in jsdom.
 */

mockTds();
mockAppsInToss();
mockRouter();

vi.mock("@/hooks/useOffers", () => ({
  useOffers: vi.fn(),
}));

import OfferForm from "@/pages/OfferForm";
import { useOffers } from "@/hooks/useOffers";

const mockSave = vi.fn();
const mockRemove = vi.fn();
const mockRefresh = vi.fn();

const existingOffer: Offer = {
  id: "o_1",
  kind: "offer",
  companyName: "카카오",
  baseSalaryManwon: 7000,
  bonusManwon: 800,
  welfarePointManwon: 200,
  remoteDaysPerWeek: 3,
  commuteMinutesOneWay: 25,
  commuteCostPerDayWon: 2800,
  lunchCostPerDayWon: 0,
  growthScore: 4,
  cultureScore: 4,
  stabilityScore: 3,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

function setupUseOffers(offers: Offer[] = []) {
  vi.mocked(useOffers).mockReturnValue({
    isLoading: false,
    offers,
    current: offers.find((o) => o.kind === "current"),
    save: mockSave,
    remove: mockRemove,
    refresh: mockRefresh,
    loadError: false,
  } as unknown as ReturnType<typeof useOffers>);
}

function renderForm(path: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(
        Routes,
        null,
        React.createElement(Route, { path: "/offer/new", element: React.createElement(OfferForm) }),
        React.createElement(Route, { path: "/offer/:id/edit", element: React.createElement(OfferForm) }),
      ),
    ),
  );
}

function companyInput(): HTMLInputElement {
  return document.querySelector('input[name="companyName"]') as HTMLInputElement;
}

function fieldInput(name: string): HTMLInputElement {
  return document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
}

function fillMinimalValid() {
  fireEvent.change(companyInput(), { target: { value: "토스" } });
  fireEvent.change(fieldInput("baseSalaryManwon"), { target: { value: "5000" } });
}

beforeEach(() => {
  mockSave.mockReset();
  mockRemove.mockReset();
  mockRefresh.mockReset();
  mockNavigate.mockReset();
  mockLocation.state = null;
  setupUseOffers([]);
});

describe("직장·오퍼 입력 폼 화면 (`/offer/new`, `/offer/:id/edit`)", () => {
  // ==========================================================================
  // AC-1[P0]: location.state 없이 /offer/new 직접 진입 → 크래시 없이 kind='offer' 기본값
  // ==========================================================================
  describe("AC-1[P0]: /offer/new 직접 진입 시 kind='offer' 기본값", () => {
    it("state 없이 렌더돼도 크래시 없이 Top 타이틀이 '받은 오퍼'다(현재 직장 아님)", () => {
      expect(() => renderForm("/offer/new")).not.toThrow();

      expect(screen.getByText("받은 오퍼")).toBeInTheDocument();
      expect(screen.queryByText("현재 직장")).not.toBeInTheDocument();
    });

    it("회사명 입력값이 빈 문자열로 초기화된다", () => {
      renderForm("/offer/new");

      expect(companyInput()).not.toBeNull();
      expect(companyInput().value).toBe("");
    });
  });

  // ==========================================================================
  // AC-2[P0]: 회사명 빈 값/21자 → hasError + 안내 문구, 저장 Button disabled
  // ==========================================================================
  describe("AC-2[P0]: 회사명 1~20자 검증", () => {
    it("빈 회사명(기본 상태)이면 저장 Button이 disabled다", () => {
      renderForm("/offer/new");

      const saveButton = screen.getByRole("button", { name: "저장하기" });
      expect(saveButton).toBeDisabled();
      expect(companyInput().value).toBe("");
    });

    it("21자 회사명 입력 시 hasError로 '1~20자로 입력할 수 있어요'가 표시되고 저장 Button이 disabled다", () => {
      renderForm("/offer/new");

      fireEvent.change(companyInput(), { target: { value: "가".repeat(21) } });

      expect(screen.getByRole("alert")).toHaveTextContent("1~20자로 입력할 수 있어요");
      expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
    });

    it("1~20자 유효한 회사명 + 필수값 입력 시 에러가 사라지고 저장 Button이 활성화된다", () => {
      renderForm("/offer/new");

      fillMinimalValid();

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "저장하기" })).not.toBeDisabled();
    });
  });

  // ==========================================================================
  // AC-3[P0]: 저장 성공 → navigate('/offers'), 실패 → SaveResult.error Toast
  // ==========================================================================
  describe("AC-3[P0]: 저장 성공/실패", () => {
    it("저장 성공(SaveResult.ok=true) 시 save()가 1회 호출되고 navigate('/offers')로 이동한다", () => {
      mockSave.mockReturnValue({ ok: true });
      renderForm("/offer/new");

      fillMinimalValid();
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/offers");
    });

    it("저장 실패(SaveResult.ok=false) 시 SaveResult.error 문구가 Toast로 표시되고 이동하지 않는다", () => {
      mockSave.mockReturnValue({ ok: false, error: "저장 공간이 부족해요. 오퍼를 삭제 후 다시 시도해주세요." });
      renderForm("/offer/new");

      fillMinimalValid();
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(screen.getByText("저장 공간이 부족해요. 오퍼를 삭제 후 다시 시도해주세요.")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // AC-4[P0]: 편집 모드 프리필 + Top right 삭제(color='danger') + AlertDialog 확인 후 remove
  // ==========================================================================
  describe("AC-4[P0]: 편집 모드 프리필 + 삭제", () => {
    it("기존 오퍼 값이 각 필드에 프리필된다", () => {
      setupUseOffers([existingOffer]);
      renderForm(`/offer/${existingOffer.id}/edit`);

      expect(companyInput().value).toBe("카카오");
      expect(fieldInput("baseSalaryManwon").value).toBe("7000");
      expect(fieldInput("commuteMinutesOneWay").value).toBe("25");
    });

    it("Top right에 삭제 Button(color='danger')이 노출된다(신규 모드에는 없음)", () => {
      setupUseOffers([existingOffer]);
      renderForm(`/offer/${existingOffer.id}/edit`);

      const deleteButton = screen.getByRole("button", { name: "삭제" });
      expect(deleteButton).toHaveAttribute("color", "danger");

      renderForm("/offer/new");
      expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    });

    it("삭제 탭 시 AlertDialog(왼쪽 버튼 '닫기')가 뜨고, 확인 시 remove(id)가 호출된다", () => {
      setupUseOffers([existingOffer]);
      renderForm(`/offer/${existingOffer.id}/edit`);

      fireEvent.click(screen.getByRole("button", { name: "삭제" }));

      const dialog = screen.getByRole("alertdialog");
      expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole("button", { name: "삭제" }));

      expect(mockRemove).toHaveBeenCalledTimes(1);
      expect(mockRemove).toHaveBeenCalledWith(existingOffer.id);
    });
  });

  // ==========================================================================
  // AC-5[P1]: 숫자 필드 inputMode='numeric', 정수 외 입력은 저장 시 거부
  // ==========================================================================
  describe("AC-5[P1]: 숫자 필드 inputMode + 정수 검증", () => {
    it("연봉·통근시간 입력의 inputmode가 'numeric'이다", () => {
      renderForm("/offer/new");

      expect(fieldInput("baseSalaryManwon").getAttribute("inputmode")).toBe("numeric");
      expect(fieldInput("commuteMinutesOneWay").getAttribute("inputmode")).toBe("numeric");
    });

    it("연봉에 정수가 아닌 값(소수)을 입력하면 저장 시 save()가 호출되지 않는다", () => {
      renderForm("/offer/new");

      fireEvent.change(companyInput(), { target: { value: "토스" } });
      fireEvent.change(fieldInput("baseSalaryManwon"), { target: { value: "5000.5" } });
      fireEvent.click(screen.getByRole("button", { name: "저장하기" }));

      expect(mockSave).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
