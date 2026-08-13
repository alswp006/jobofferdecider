import { useState, useEffect } from "react";
import { loadMeta, setCalcNoticeAcknowledged } from "@/lib/storage";

export function useAppMeta() {
  const [isLoading, setIsLoading] = useState(true);
  const [calcNoticeAcknowledged, setCalcNoticeAcknowledgedLocal] = useState(false);

  useEffect(() => {
    const load = async () => {
      await Promise.resolve(); // Ensure isLoading stays true for at least 1 tick
      const meta = loadMeta();
      setCalcNoticeAcknowledgedLocal(meta.calcNoticeAcknowledged);
      setIsLoading(false);
    };
    load();
  }, []);

  const acknowledgeCalcNotice = (): void => {
    setCalcNoticeAcknowledged(true);
    setCalcNoticeAcknowledgedLocal(true);
  };

  return {
    isLoading,
    calcNoticeAcknowledged,
    acknowledgeCalcNotice,
  };
}
