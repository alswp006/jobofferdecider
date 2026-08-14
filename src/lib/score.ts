import type { CompanyProfile, ScoreItem, ScoreResult, Weights } from "@/lib/types";
import { DEFAULT_WEIGHTS } from "@/lib/types";
import { SCORE_LABELS } from "@/lib/constants";
import { calcMoney } from "@/lib/calc";

const NON_MONETARY_KEYS = ["growth", "workLife", "stability", "culture", "commuteEase"] as const;

/** 가중치를 비율(합 1)로 정규화. 합이 0이면 DEFAULT_WEIGHTS 사용 */
export function normalizeWeights(weights: Weights): Record<keyof Weights, number> {
  const source = Object.values(weights).reduce((sum, v) => sum + v, 0) === 0 ? DEFAULT_WEIGHTS : weights;
  const total = Object.values(source).reduce((sum, v) => sum + v, 0);

  const entries = Object.entries(source) as [keyof Weights, number][];
  return entries.reduce(
    (acc, [key, value]) => {
      acc[key] = Math.round((value / total) * 10000) / 10000;
      return acc;
    },
    {} as Record<keyof Weights, number>,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 종합 점수 및 판정 결과 산출 */
export function calcScore(
  current: CompanyProfile | null,
  offer: CompanyProfile,
  weights: Weights,
): ScoreResult | null {
  if (current === null) return null;

  const currentMoney = calcMoney(current);
  const offerMoney = calcMoney(offer);
  const weightRatios = normalizeWeights(weights);

  const currentNet = (current.baseSalary + current.bonusPerYear) / 12;
  const offerNet = (offer.baseSalary + offer.bonusPerYear) / 12;

  if (currentNet <= 0) return null;

  const moneyItem: ScoreItem = {
    key: "money",
    label: SCORE_LABELS.money,
    currentScore: 50,
    offerScore: clamp(Math.round(50 + ((offerNet - currentNet) / currentNet) * 200), 0, 100),
    weightRatio: weightRatios.money,
  };

  const nonMonetaryItems: ScoreItem[] = NON_MONETARY_KEYS.map((key) => ({
    key,
    label: SCORE_LABELS[key],
    currentScore: current.ratings[key] * 20,
    offerScore: offer.ratings[key] * 20,
    weightRatio: weightRatios[key],
  }));

  const items = [moneyItem, ...nonMonetaryItems];

  const currentTotal = Math.round(items.reduce((sum, item) => sum + item.currentScore * item.weightRatio, 0));
  const offerTotal = Math.round(items.reduce((sum, item) => sum + item.offerScore * item.weightRatio, 0));

  return {
    offerId: offer.id,
    items,
    currentTotal,
    offerTotal,
    diff: offerTotal - currentTotal,
    verdict: "HOLD",
    verdictLabel: "",
    negotiationPoints: [],
    currentMoney,
    offerMoney,
  };
}
