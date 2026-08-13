import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockAppsInToss();

import { TossRewardAd } from "@/components/TossRewardAd";

describe("debug2", () => {
  it("renders bare", () => {
    render(
      React.createElement(
        TossRewardAd,
        { slotId: "x" },
        React.createElement("div", null, "CHILD_CONTENT"),
      ),
    );
    console.log("BARE HTML", document.body.innerHTML);
  });
});
