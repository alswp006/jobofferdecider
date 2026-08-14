import { useEffect, useState } from 'react';
import { AlertDialog } from '@toss/tds-mobile';
import { ONBOARDED_KEY } from '@/lib/constants';

/**
 * 최초 1회만 뜨는 안내 다이얼로그.
 * props 없이 쓰면 스스로 노출 여부를 판단하고(localStorage), isOpen을 주면 그 값을 따른다.
 */
export function OnboardingDialog({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
} = {}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isOpen !== undefined) return;
    try {
      if (window.localStorage.getItem(ONBOARDED_KEY) !== '1') setOpen(true);
    } catch {
      /* 스토리지 접근 불가(프라이빗 모드 등) — 안내를 건너뛴다 */
    }
  }, [isOpen]);

  const visible = isOpen ?? open;

  const close = () => {
    try {
      window.localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      /* 저장 실패해도 화면은 닫는다 */
    }
    setOpen(false);
    onClose?.();
  };

  return (
    <AlertDialog
      open={visible}
      title="어떻게 비교하나요?"
      description="연봉만이 아니라 통근·식대·복지·비금전 항목까지 합쳐 월 실질가치로 비교해요"
      alertButton={<AlertDialog.AlertButton onClick={close}>확인</AlertDialog.AlertButton>}
      onClose={close}
    />
  );
}
