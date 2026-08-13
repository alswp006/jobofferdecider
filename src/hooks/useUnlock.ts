import { useState, useEffect } from "react";
import { loadUnlock, addUnlockKey } from "@/lib/storage";

export function useUnlock() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  const isUnlocked = (currentId: string, targetId: string): boolean => {
    const state = loadUnlock();
    const key = `${currentId}:${targetId}`;
    return state.unlockedComparisonKeys.includes(key);
  };

  const unlock = (currentId: string, targetId: string): void => {
    const key = `${currentId}:${targetId}`;
    addUnlockKey(key);
  };

  return {
    isLoading,
    isUnlocked,
    unlock,
  };
}
