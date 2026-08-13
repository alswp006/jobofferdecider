import type { Offer, Weights, Axis, AxisScore, MoneyBreakdown, Verdict, ScoreResult } from "@/lib/types";
import { AXIS_ORDER, AXIS_LABELS, DEFAULT_WEIGHTS } from "@/lib/types";
import { calcMonthlyNet, getEffectiveTaxRate } from "@/lib/calc";
import { buildNegotiationPoints } from "@/lib/negotiation";

const HIGHER_IS_BETTER: Record<Axis, boolean> = {
  money: true,
  remote: true,
  commute: false,
  growth: true,
  culture: true,
  stability: true,
};

function moneyInput(offer: Offer) {
  return {
    base: offer.baseSalaryManwon,
    bonus: offer.bonusManwon,
    welfare: offer.welfarePointManwon,
    remote: offer.remoteDaysPerWeek,
    commute: offer.commuteCostPerDayWon,
    lunch: offer.lunchCostPerDayWon,
  };
}

function extractRaw(axis: Axis, offer: Offer, monthlyNet: number): number {
  switch (axis) {
    case "money":
      return monthlyNet;
    case "remote":
      return offer.remoteDaysPerWeek;
    case "commute":
      return offer.commuteMinutesOneWay;
    case "growth":
      return offer.growthScore;
    case "culture":
      return offer.cultureScore;
    case "stability":
      return offer.stabilityScore;
  }
}

function normalize(
  rawCurrent: number,
  rawTarget: number,
  higherIsBetter: boolean,
): { normCurrent: number; normTarget: number } {
  if (rawCurrent === rawTarget) {
    return { normCurrent: 50, normTarget: 50 };
  }
  const max = Math.max(rawCurrent, rawTarget);
  const min = Math.min(rawCurrent, rawTarget);
  const project = (x: number) => (higherIsBetter ? x : max + min - x);
  const norm = (x: number) => Math.round(((project(x) - min) / (max - min)) * 60 + 40);
  return { normCurrent: norm(rawCurrent), normTarget: norm(rawTarget) };
}

function buildMoneyBreakdown(current: Offer, target: Offer): MoneyBreakdown {
  const currentMonthlyNetWon = calcMonthlyNet(moneyInput(current));
  const targetMonthlyNetWon = calcMonthlyNet(moneyInput(target));
  const currentAnnualGrossWon = (current.baseSalaryManwon + current.bonusManwon) * 10000;
  const targetAnnualGrossWon = (target.baseSalaryManwon + target.bonusManwon) * 10000;

  return {
    currentMonthlyNetWon,
    targetMonthlyNetWon,
    diffMonthlyWon: targetMonthlyNetWon - currentMonthlyNetWon,
    diffYearlyWon: (targetMonthlyNetWon - currentMonthlyNetWon) * 12,
    currentTaxWon: Math.round(currentAnnualGrossWon * getEffectiveTaxRate(currentAnnualGrossWon)),
    targetTaxWon: Math.round(targetAnnualGrossWon * getEffectiveTaxRate(targetAnnualGrossWon)),
  };
}

function resolveVerdict(gap: number): Verdict {
  if (gap >= 15) return "strong_move";
  if (gap >= 5) return "lean_move";
  if (gap > -5) return "neutral";
  if (gap > -15) return "lean_stay";
  return "strong_stay";
}

export function buildScoreResult(current: Offer, target: Offer, weights: Weights): ScoreResult {
  const sumWeight = AXIS_ORDER.reduce((sum, axis) => sum + weights[axis], 0);
  const effectiveWeights = sumWeight === 0 ? DEFAULT_WEIGHTS : weights;
  const effectiveSumWeight = sumWeight === 0 ? AXIS_ORDER.reduce((sum, axis) => sum + DEFAULT_WEIGHTS[axis], 0) : sumWeight;

  const money = buildMoneyBreakdown(current, target);

  const axes: AxisScore[] = AXIS_ORDER.map((axis) => {
    const rawCurrent = extractRaw(axis, current, money.currentMonthlyNetWon);
    const rawTarget = extractRaw(axis, target, money.targetMonthlyNetWon);
    const { normCurrent, normTarget } = normalize(rawCurrent, rawTarget, HIGHER_IS_BETTER[axis]);
    const weight = effectiveWeights[axis];

    return {
      axis,
      label: AXIS_LABELS[axis],
      rawCurrent,
      rawTarget,
      normCurrent,
      normTarget,
      weight,
      weightedCurrent: (normCurrent * weight) / effectiveSumWeight,
      weightedTarget: (normTarget * weight) / effectiveSumWeight,
    };
  });

  const totalCurrent = Math.round(axes.reduce((sum, a) => sum + a.weightedCurrent, 0) * 10) / 10;
  const totalTarget = Math.round(axes.reduce((sum, a) => sum + a.weightedTarget, 0) * 10) / 10;
  const gap = Math.round((totalTarget - totalCurrent) * 10) / 10;

  const disadvantagedAxes = axes
    .filter((a) => a.normTarget < a.normCurrent)
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return AXIS_ORDER.indexOf(a.axis) - AXIS_ORDER.indexOf(b.axis);
    })
    .slice(0, 3);

  const targetAnnualGrossWon = (target.baseSalaryManwon + target.bonusManwon) * 10000;
  const negotiationPoints = buildNegotiationPoints(disadvantagedAxes, money, targetAnnualGrossWon);

  return {
    currentOfferId: current.id,
    targetOfferId: target.id,
    axes,
    totalCurrent,
    totalTarget,
    gap,
    money,
    verdict: resolveVerdict(gap),
    negotiationPoints,
    computedAt: Date.now(),
  };
}
