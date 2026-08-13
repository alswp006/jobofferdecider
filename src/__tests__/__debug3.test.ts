import { describe, it, expect } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DebugComp } from "@/components/__DebugComp";

describe("debug3", () => {
  it("renders bare", () => {
    render(React.createElement(DebugComp, null, React.createElement("div", null, "CHILD")));
    console.log("BARE HTML", document.body.innerHTML);
  });
});
