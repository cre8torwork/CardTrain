import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIdleTimerOptions {
  idleMs?: number;
  warningMs?: number;
  enabled?: boolean;
  onIdle: () => void;
}

interface UseIdleTimerResult {
  isWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
}

const IDLE_MS_DEFAULT = 30 * 60 * 1000;
const WARNING_MS_DEFAULT = 2 * 60 * 1000;

// 記錄「切到背景的時間點」
const BG_ENTER_KEY = 'idle_bg_enter_ts';
// 記錄「最後一次用戶活動時間點」
const LAST_ACTIVE_KEY = 'idle_last_active_ts';

const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'touchend',
  'click',
  'wheel',
  'pointerdown',
];

export function useIdleTimer({
  idleMs = IDLE_MS_DEFAULT,
  warningMs = WARNING_MS_DEFAULT,
  enabled = true,
  onIdle,
}: UseIdleTimerOptions): UseIdleTimerResult {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const idleMsRef = useRef(idleMs);
  idleMsRef.current = idleMs;
  const warningMsRef = useRef(warningMs);
  warningMsRef.current = warningMs;

  const clearAll = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  }, []);

  const startCountdown = useCallback((msLeft: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    const secLeft = Math.max(0, Math.floor(msLeft / 1000));
    setIsWarning(true);
    setRemainingSeconds(secLeft);
    countdownRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 根據「距離閒置還剩多少 ms」重新設定計時器
  const scheduleFromRemaining = useCallback((remainingMs: number) => {
    clearAll();
    setIsWarning(false);
    setRemainingSeconds(0);

    const _idleMs = idleMsRef.current;
    const _warningMs = warningMsRef.current;

    if (remainingMs <= 0) {
      // 已超時，直接登出
      onIdleRef.current();
      return;
    }

    if (remainingMs <= _warningMs) {
      // 已在警告區間
      startCountdown(remainingMs);
      idleTimerRef.current = setTimeout(() => {
        clearAll();
        setIsWarning(false);
        onIdleRef.current();
      }, remainingMs);
    } else {
      // 正常區間
      warningTimerRef.current = setTimeout(() => {
        startCountdown(_warningMs);
      }, remainingMs - _warningMs);

      idleTimerRef.current = setTimeout(() => {
        clearAll();
        setIsWarning(false);
        onIdleRef.current();
      }, remainingMs);
    }
  }, [clearAll, startCountdown]);

  // 用戶有活動 → 重置計時器，並更新最後活動時間戳
  const resetTimer = useCallback(() => {
    if (!enabledRef.current) return;
    try { sessionStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())); } catch { /* ignore */ }
    scheduleFromRemaining(idleMsRef.current);
  }, [scheduleFromRemaining]);

  useEffect(() => {
    if (!enabled) {
      clearAll();
      setIsWarning(false);
      return;
    }

    // 初始化：設定計時器
    resetTimer();

    // 用戶活動事件
    const handleActivity = () => resetTimer();
    ACTIVITY_EVENTS.forEach((ev) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.addEventListener(ev as any, handleActivity, { passive: true });
    });

    // visibilitychange：處理切背景 / 鎖屏 / 切回前台
    const handleVisibility = () => {
      if (!enabledRef.current) return;

      if (document.visibilityState === 'hidden') {
        // ★ 切到背景時：記錄此刻時間戳
        try { sessionStorage.setItem(BG_ENTER_KEY, String(Date.now())); } catch { /* ignore */ }
        // 暫停前台計時器（背景時 setTimeout 不可靠）
        clearAll();

      } else {
        // ★ 切回前台時：計算在背景待了多久
        let bgEnterTs: number | null = null;
        try {
          const val = sessionStorage.getItem(BG_ENTER_KEY);
          bgEnterTs = val ? parseInt(val, 10) : null;
          sessionStorage.removeItem(BG_ENTER_KEY);
        } catch { /* ignore */ }

        if (bgEnterTs === null) {
          // 沒有背景記錄，重新從最後活動時間計算
          let lastActive = Date.now();
          try {
            const val = sessionStorage.getItem(LAST_ACTIVE_KEY);
            if (val) lastActive = parseInt(val, 10);
          } catch { /* ignore */ }
          const elapsed = Date.now() - lastActive;
          scheduleFromRemaining(idleMsRef.current - elapsed);
        } else {
          // 有背景記錄：背景時間 + 切到背景前已閒置的時間
          const bgDuration = Date.now() - bgEnterTs;

          // 切到背景前，距離登出還剩多少時間
          // 用最後活動時間推算
          let lastActive = bgEnterTs; // 預設：切到背景那一刻就是最後活動
          try {
            const val = sessionStorage.getItem(LAST_ACTIVE_KEY);
            if (val) lastActive = parseInt(val, 10);
          } catch { /* ignore */ }

          const alreadyIdleBeforeBg = bgEnterTs - lastActive;
          const totalIdle = alreadyIdleBeforeBg + bgDuration;
          const remainingMs = idleMsRef.current - totalIdle;

          scheduleFromRemaining(remainingMs);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearAll();
      ACTIVITY_EVENTS.forEach((ev) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        window.removeEventListener(ev as any, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { isWarning, remainingSeconds, resetTimer };
}
