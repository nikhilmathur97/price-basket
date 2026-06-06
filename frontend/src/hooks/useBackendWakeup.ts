"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Encapsulates the "waking up servers" countdown + auto-retry logic shared by
 * the login and signup pages. When the backend returns 503 (cold start), call
 * `trigger(formId)` to start a 5-second countdown that auto-submits the form.
 */
export function useBackendWakeup(formId: string) {
  const [wakingUp, setWakingUp] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown tick
  useEffect(() => {
    if (retryCountdown <= 0) return;
    const t = setTimeout(() => setRetryCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [retryCountdown]);

  // Auto-retry when countdown reaches 0
  useEffect(() => {
    if (retryCountdown !== 0 || !wakingUp) return;
    setWakingUp(false);
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      document
        .getElementById(formId)
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    }, 100);
  }, [retryCountdown, wakingUp, formId]);

  function trigger() {
    setWakingUp(true);
    setRetryCountdown(5);
  }

  return { wakingUp, retryCountdown, trigger, setWakingUp };
}
