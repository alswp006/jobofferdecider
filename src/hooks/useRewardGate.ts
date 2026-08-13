import { useCallback, useState } from "react";
import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { addUnlockKey, loadUnlock } from "@/lib/storage";

/** 광고 실패 시 노출할 문구 — 호출부가 Toast(position="bottom")로 띄운다. */
export const REWARD_GATE_ERROR_TEXT = "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";

/** 아직 시청이 끝나지 않은 진행 중 이벤트 — 여기서는 아무 것도 확정하지 않는다. */
const IN_PROGRESS_EVENTS: string[] = ["requested", "show", "impression", "clicked"];

/** 시청 완료로 볼 수 없는 종료 이벤트 (재생 실패 / 중도 이탈). */
const FAILURE_EVENTS: string[] = ["failedToShow", "dismissed"];

function unlockKeyOf(currentId: string, targetId: string): string {
  return `${currentId}:${targetId}`;
}

export interface RewardGate {
  isUnlocked: boolean;
  isLoading: boolean;
  error: string | null;
  requestUnlock: () => void;
  retry: () => void;
}

/**
 * 비교 조합(현재 직장 × 제안 오퍼)의 리워드 광고 게이트 상태.
 *
 * 한 번 해제한 조합은 UnlockState에 영속 저장되어 재시청 없이 열린다.
 * 광고 API는 앱인토스 WebView에서만 동작하고 그 밖(로컬 브라우저·jsdom)에서는
 * 호출 자체가 예외를 던지므로 전부 try/catch로 감싼다 — 실패는 error 문구로만
 * 노출하고 절대 밖으로 던지지 않는다(흰 화면 방지).
 */
export function useRewardGate(currentId: string, targetId: string): RewardGate {
  const key = unlockKeyOf(currentId, targetId);
  const [isUnlocked, setIsUnlocked] = useState(
    () => loadUnlock().unlockedComparisonKeys.includes(key),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestUnlock = useCallback(() => {
    if (isUnlocked || isLoading) return;
    setIsLoading(true);
    setError(null);

    // 광고 SDK는 완료·실패 이벤트를 여러 번 흘려보낼 수 있다(예: 리워드 직후 dismissed).
    // 첫 결과만 확정하고 이후 콜백은 무시한다.
    let settled = false;

    const fail = () => {
      if (settled) return;
      settled = true;
      setIsLoading(false);
      setError(REWARD_GATE_ERROR_TEXT);
    };

    const succeed = () => {
      if (settled) return;
      settled = true;
      addUnlockKey(key);
      setIsUnlocked(true);
      setIsLoading(false);
      setError(null);
    };

    const show = () => {
      try {
        showFullScreenAd({
          options: { adGroupId: import.meta.env.VITE_TOSS_AD_SLOT_ID },
          onEvent: (event) => {
            if (FAILURE_EVENTS.includes(event.type)) {
              fail();
              return;
            }
            if (IN_PROGRESS_EVENTS.includes(event.type)) return;
            succeed();
          },
          onError: fail,
        });
      } catch {
        fail();
      }
    };

    try {
      loadFullScreenAd({
        options: { adGroupId: import.meta.env.VITE_TOSS_AD_SLOT_ID },
        onEvent: show,
        onError: fail,
      });
    } catch {
      fail();
    }
  }, [isUnlocked, isLoading, key]);

  const retry = useCallback(() => {
    setError(null);
    requestUnlock();
  }, [requestUnlock]);

  return { isUnlocked, isLoading, error, requestUnlock, retry };
}
