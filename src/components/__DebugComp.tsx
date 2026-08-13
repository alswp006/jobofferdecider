import { useState } from "react";
import { loadFullScreenAd } from "@apps-in-toss/web-framework";
import "@/styles/reward-ad.css";

export function DebugComp({ children }: { children: React.ReactNode }) {
  const [x] = useState(false);
  console.log("DEBUG DebugComp rendering, x=", x, typeof loadFullScreenAd);
  return <div data-marker="debug-comp">{x ? children : "GATE"}</div>;
}
