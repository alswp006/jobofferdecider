import { useState } from "react";
import type { RefObject } from "react";
import { toPng } from "html-to-image";
import { Button, BottomSheet, Paragraph, Spacing, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

interface SaveResultImageProps {
  /** PNG로 변환할 결과 카드 DOM */
  targetRef: RefObject<HTMLElement>;
  /** 파일명에 쓰일 오퍼 ID */
  offerId: string;
}

/**
 * 결과 카드를 PNG로 저장하는 버튼 (F7).
 * <a download>가 동작하지 않는 환경(구형 WebView 등)에서는
 * BottomSheet로 미리보기를 띄워 "길게 눌러 저장" 폴백을 제공한다.
 */
export default function SaveResultImage({ targetRef, offerId }: SaveResultImageProps) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, text: "" });
  const [preview, setPreview] = useState<{ open: boolean; dataUrl: string }>({
    open: false,
    dataUrl: "",
  });

  const handleSave = async () => {
    if (saving || !targetRef.current) return;

    try {
      generateHapticFeedback({ type: "success" });
    } catch {
      // 네이티브 브릿지가 없는 환경(로컬 브라우저 등) — 무시
    }

    setSaving(true);
    try {
      const dataUrl = await toPng(targetRef.current);
      const anchor = document.createElement("a");
      if ("download" in anchor) {
        anchor.href = dataUrl;
        anchor.download = `joboffer-result-${offerId}.png`;
        anchor.click();
        setToast({ open: true, text: "이미지를 저장했어요" });
      } else {
        setPreview({ open: true, dataUrl });
      }
    } catch {
      setToast({ open: true, text: "이미지를 만들지 못했어요. 다시 시도해주세요" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="weak" size="large" display="block" onClick={handleSave} loading={saving}>
        결과 이미지로 저장하기
      </Button>
      <Toast
        open={toast.open}
        position="bottom"
        text={toast.text}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
      <BottomSheet
        open={preview.open}
        onClose={() => setPreview((p) => ({ ...p, open: false }))}
      >
        <Paragraph.Text typography="t4">이미지를 길게 눌러 저장해주세요</Paragraph.Text>
        <Spacing size={16} />
        {preview.dataUrl && (
          <img src={preview.dataUrl} alt="결과 이미지 미리보기" style={{ width: "100%" }} />
        )}
        <Spacing size={16} />
        <Button
          variant="weak"
          size="large"
          display="block"
          onClick={() => setPreview((p) => ({ ...p, open: false }))}
        >
          닫기
        </Button>
      </BottomSheet>
    </>
  );
}
