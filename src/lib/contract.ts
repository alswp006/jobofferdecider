/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type RouteState = 'home' | 'company' | 'weights' | 'result' | 'compare';

export type Company = { id: string; name: string; industry: string; size: number; revenue: number };

export type Offer = { id: string; salary: number; bonus: number; benefits: string[]; year: number };

export type Weights = { salary: number; bonus: number; benefits: number; growth: number; culture: number };

export type Score = { total: number; salary: number; bonus: number; benefits: number; growth: number; culture: number };

export type calcMoneyFn = (amount: number, opts?: { currency?: string; rate?: number }) => string;

export type calcScoreFn = (company: Company, offer: Offer, weights: Weights) => Score;

export type getVerdictFn = (score: Score, threshold?: number) => { passed: boolean; message: string };

export type useAppStateFn = () => { route: RouteState; company: Company | null; weights: Weights; offers: Offer[]; setRoute: (r: RouteState) => void };

export type validateFormFn = (data: unknown, schema: string) => { valid: boolean; errors: Record<string, string> };

export type parseNumberInputFn = (value: string, opts?: { decimal?: number; min?: number; max?: number }) => number | null;

export type saveAppDataFn = (key: string, data: unknown) => void;

export type loadAppDataFn = <T = unknown>(key: string, defaultValue?: T) => T | null;

/** key 생략 시 전체 삭제 (구현: 패킷 0003) */
export type clearAppDataFn = (key?: string) => void;
