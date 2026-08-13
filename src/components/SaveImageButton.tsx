import { useState } from "react";
import { Button, Toast, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { ScoreResult } from "@/lib/types";
import { saveResultImage } from "@/lib/shareImage";

interface SaveImageButtonProps {
  result: ScoreResult;
  companyNames: { current: string; target: string };
}

function fireSuccessHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

/**
 * 결과 이미지 저장 버튼 — canvas → PNG Blob → a[download]로 저장.
 * Pre-built (재구현 금지 대상 아님, 이 패킷의 전용 컴포넌트): 결과 화면에서 그대로 import.
 */
export function SaveImageButton({ result, companyNames }: SaveImageButtonProps) {
  const [toast, setToast] = useState<{ open: boolean; text: string }>({ open: false, text: "" });

  async function handleClick() {
    const ok = await saveResultImage(result, companyNames);

    if (ok) {
      fireSuccessHaptic();
      setToast({ open: true, text: "이미지를 저장했어요" });
    } else {
      setToast({ open: true, text: "이미지를 저장하지 못했어요. 다시 시도해주세요." });
    }
  }

  return (
    <>
      <Button
        variant="weak"
        size="large"
        display="block"
        onClick={handleClick}
        style={{ minHeight: 48 }}
      >
        결과 이미지 저장
      </Button>
      <Spacing size={8} />
      <Toast
        open={toast.open}
        text={toast.text}
        position="bottom"
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
    </>
  );
}
