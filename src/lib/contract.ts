/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type Offer = { id: string; date: string; company: string; position: string; baseSalary: number; amountKrw?: number; scores: { growth: number; culture: number; stability: number }; createdAt: string };

export type Weight = { growth: number; culture: number; stability: number; salary: number };

export type RouteState = 'home' | 'offers' | 'offer-new' | 'offer-edit' | 'weights' | 'compare' | 'rank';

export type useOffersFn = () => { offers: Offer[]; addOffer: (o: Offer) => void; updateOffer: (id: string, o: Partial<Offer>) => void; deleteOffer: (id: string) => void };

export type useWeightsFn = () => { weights: Weight; setWeights: (w: Weight) => void };

export type useUnlockFn = () => { unlockedFeatures: string[]; unlock: (featureId: string) => void };

export type useAppMetaFn = () => { version: string; initialized: boolean };

export type useRewardGateFn = () => { isUnlocked: boolean; remainingAds: number; watchAd: () => Promise<void> };

export type loadOffersFn = () => Offer[];

export type saveOfferFn = (offer: Offer) => void;

export type deleteOfferFn = (id: string) => void;

export type calculateMonthlyIncomeFn = (offer: Offer) => number;

export type validateOfferFn = (offer: Partial<Offer>) => { valid: boolean; errors: string[] };

export type calculateTotalScoreFn = (offer: Offer, weights: Weight) => number;

export type normalizeScoreFn = (score: number, min?: number, max?: number) => number;

export type ScoreSelectorProps = { score: number; onScoreChange: (v: number) => void; label?: string; max?: number };

export type CompareDetailProps = { offer1: Offer; offer2: Offer; weights: Weight; baseline?: number };

export type generateCompareImageFn = (offer1: Offer, offer2: Offer, scores: { s1: number; s2: number }, weights: Weight) => Promise<Blob>;

export type SaveImageButtonProps = { data: { offer1: Offer; offer2: Offer; scores: { s1: number; s2: number } }; onSaved?: () => void };

export type AdSectionProps = { placement: 'top' | 'bottom' | 'modal'; onAdComplete?: () => void };
