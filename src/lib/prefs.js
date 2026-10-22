import { useEffect, useState } from "react";

// useState that remembers its value in this browser (per viewer).
// Storage can be unavailable (private mode, blocked site data), so every
// access is guarded and the default is used when it fails.
export function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(`bsr-dash:${key}`);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(`bsr-dash:${key}`, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, value]);
  return [value, setValue];
}
