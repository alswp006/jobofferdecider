import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import type { Offer } from "@/lib/types";

mockAll();

// ── @/lib/storage ── loadOffers is mocked per-test to control fixture/error states.
const mockLoadOffers = vi.fn();
vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, loadOffers: () => mockLoadOffers() };
});

import Offers from "@/pages/Offers";

function makeOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: "o_1",
    kind: "offer",
    companyName: "토스뱅크",
    baseSalaryManwon: 6000,
    bonusManwon: 500,
    welfarePointManwon: 100,
    remoteDaysPerWeek: 2,
    commuteMinutesOneWay: 30,
    commuteCostPerDayWon: 3000,
    lunchCostPerDayWon: 8000,
    growthScore: 4,
    cultureScore: 4,
    stabilityScore: 3,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides,
  };
}

const CURRENT = makeOffer({ id: "o_current", kind: "current", companyName: "현재회사" });

describe("오퍼 목록 화면 (`/offers`)", () => {
  it("AC-1[P0]: idx 0(현재 직장) 탭은 current 1건만 렌더하고 offer는 렌더하지 않는다", () => {
    const offer1 = makeOffer({ id: "o_1", companyName: "토스뱅크" });
    const offer2 = makeOffer({ id: "o_2", companyName: "카카오페이" });
    mockLoadOffers.mockReturnValue([CURRENT, offer1, offer2]);

    renderWithRouter(React.createElement(Offers));

    expect(screen.getByText("현재회사")).toBeInTheDocument();
    expect(screen.queryByText("토스뱅크")).not.toBeInTheDocument();
    expect(screen.queryByText("카카오페이")).not.toBeInTheDocument();
  });

  it("AC-1[P0]: idx 1(받은 오퍼) 탭 전환 시 offer 목록만 렌더하고 current는 렌더하지 않는다", () => {
    const offer1 = makeOffer({ id: "o_1", companyName: "토스뱅크" });
    const offer2 = makeOffer({ id: "o_2", companyName: "카카오페이" });
    mockLoadOffers.mockReturnValue([CURRENT, offer1, offer2]);

    renderWithRouter(React.createElement(Offers));

    const offerTab = screen.getByRole("tab", { name: /받은 오퍼/ });
    fireEvent.click(offerTab);

    expect(screen.getByText("토스뱅크")).toBeInTheDocument();
    expect(screen.getByText("카카오페이")).toBeInTheDocument();
    expect(screen.queryByText("현재회사")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: offer 3건이면 하단 CTA가 disabled이고 최대 3개 안내 문구가 표시된다", () => {
    const offers = [
      makeOffer({ id: "o_1", companyName: "토스뱅크" }),
      makeOffer({ id: "o_2", companyName: "카카오페이" }),
      makeOffer({ id: "o_3", companyName: "네이버" }),
    ];
    mockLoadOffers.mockReturnValue([CURRENT, ...offers]);

    renderWithRouter(React.createElement(Offers));
    fireEvent.click(screen.getByRole("tab", { name: /받은 오퍼/ }));

    const ctaButton = screen.getByRole("button", { name: /오퍼 추가하기/ });
    expect(ctaButton).toBeDisabled();
    expect(screen.getByText("오퍼는 최대 3개까지 담을 수 있어요")).toBeInTheDocument();
  });

  it("AC-3[P0]: 행 탭 시 navigate('/offer/:id/edit')가 호출된다", () => {
    const offer1 = makeOffer({ id: "o_42", companyName: "토스뱅크" });
    mockLoadOffers.mockReturnValue([CURRENT, offer1]);

    renderWithRouter(React.createElement(Offers));
    fireEvent.click(screen.getByRole("tab", { name: /받은 오퍼/ }));
    fireEvent.click(screen.getByText("토스뱅크"));

    expect(mockNavigate).toHaveBeenCalledWith("/offer/o_42/edit");
  });

  it("AC-4: offer 목록이 비면 EmptyState를 렌더하고 하단 CTA와 중복되는 액션은 없다", () => {
    mockLoadOffers.mockReturnValue([CURRENT]);

    renderWithRouter(React.createElement(Offers));
    fireEvent.click(screen.getByRole("tab", { name: /받은 오퍼/ }));

    expect(screen.getByText("등록한 오퍼가 없어요")).toBeInTheDocument();
    // 하단 1차 CTA("오퍼 추가하기")는 정확히 1개만 존재해야 한다 (EmptyState 내부 중복 액션 금지)
    expect(screen.getAllByRole("button", { name: /오퍼 추가하기/ })).toHaveLength(1);
  });

  it("AC-5[P0]: 로드 실패 시 에러 문구와 다시 시도 버튼(weak)을 렌더한다", () => {
    mockLoadOffers.mockImplementation(() => {
      throw new Error("storage read failed");
    });

    renderWithRouter(React.createElement(Offers));

    expect(
      screen.getByText("목록을 불러오지 못했어요. 다시 시도해주세요."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다시 시도/ })).toBeInTheDocument();
  });

  it("AC-5: 다시 시도 버튼 클릭 시 목록을 재조회해서 정상 렌더한다", () => {
    mockLoadOffers.mockImplementationOnce(() => {
      throw new Error("storage read failed");
    });
    mockLoadOffers.mockImplementationOnce(() => [CURRENT]);

    renderWithRouter(React.createElement(Offers));
    fireEvent.click(screen.getByRole("button", { name: /다시 시도/ }));

    expect(screen.getByText("현재회사")).toBeInTheDocument();
    expect(
      screen.queryByText("목록을 불러오지 못했어요. 다시 시도해주세요."),
    ).not.toBeInTheDocument();
  });
});
