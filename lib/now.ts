"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();
let cached = 0;
let timer = 0;

function tickNow() {
  if (cached === 0) cached = Date.now();
  for (const l of [...listeners]) l();
}

/** stable via module-level memo — a new subscription resurrects the clock only */
const subscribers = new Map<number, (cb: Listener) => () => void>();
function subscriberFor(intervalMs: number): (cb: Listener) => () => void {
  const key = intervalMs;
  const memo = subscribers.get(key);
  if (memo) return memo;

  const fn = (cb: Listener): (() => void) => {
    listeners.add(cb);
    if (timer === 0) {
      // fill the first value outside the commit phase
      queueMicrotask(() => {
        if (listeners.size > 0 && cached === 0) tickNow();
        timer = window.setInterval(tickNow, intervalMs > 0 ? intervalMs : 60_000);
      });
    }
    return () => {
      listeners.delete(cb);
      if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = 0;
        cached = 0;
      }
    };
  };
  subscribers.set(key, fn);
  return fn;
}

function getSnapshot(): number {
  return cached;
}

/** clock read that stays out of render bodies (react-hooks purity-safe) */
export function useNow(intervalMs = 60_000): number {
  return useSyncExternalStore(subscriberFor(intervalMs), getSnapshot, () => 0);
}
