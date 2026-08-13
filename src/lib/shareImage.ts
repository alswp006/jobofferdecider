import type { ScoreResult } from "@/lib/types";
import { AXIS_ORDER, AXIS_LABELS, VERDICT_LABELS } from "@/lib/types";

interface CompanyNames {
  current: string;
  target: string;
}

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 960;

function readColor(varName: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return value || fallback;
}

function drawResult(ctx: CanvasRenderingContext2D, result: ScoreResult, companyNames: CompanyNames) {
  const bg = readColor("--adaptiveBackground", "#ffffff");
  const textColor = readColor("--adaptiveGrey900", "#191f28");
  const subColor = readColor("--adaptiveGrey600", "#6b7684");
  const accent = readColor("--adaptiveBlue500", "#3182f6");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  let y = 72;
  ctx.fillStyle = textColor;
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(VERDICT_LABELS[result.verdict], 40, y);

  y += 72;
  ctx.fillStyle = accent;
  ctx.font = "bold 56px sans-serif";
  ctx.fillText(`총점 ${result.totalTarget}점`, 40, y);

  y += 48;
  ctx.fillStyle = subColor;
  ctx.font = "24px sans-serif";
  const diffSign = result.money.diffMonthlyWon >= 0 ? "+" : "-";
  ctx.fillText(
    `월 실수령 차액 ${diffSign}${Math.abs(result.money.diffMonthlyWon).toLocaleString()}원`,
    40,
    y,
  );

  y += 56;
  ctx.font = "22px sans-serif";
  for (const axis of AXIS_ORDER) {
    const axisScore = result.axes.find((a) => a.axis === axis);
    if (!axisScore) continue;
    ctx.fillStyle = textColor;
    ctx.fillText(
      `${AXIS_LABELS[axis]}  ${companyNames.current} ${axisScore.normCurrent} · ${companyNames.target} ${axisScore.normTarget}`,
      40,
      y,
    );
    y += 40;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * 비교 결과를 canvas 2d로 그려 PNG로 다운로드한다.
 * WebView 밖·jsdom에서도 canvas API가 throw할 수 있어 전체를 가드한다 — 실패 시 throw 없이 false.
 */
export async function saveResultImage(
  result: ScoreResult,
  companyNames: CompanyNames,
): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    drawResult(ctx, result, companyNames);

    const blob = await canvasToBlob(canvas);
    if (!blob) return false;

    triggerDownload(blob, `이직결정_${companyNames.target}.png`);
    return true;
  } catch {
    return false;
  }
}
