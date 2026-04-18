"use client";

export function readLocalStorageJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore blocked storage and malformed entry cleanup failures.
    }
    return null;
  }
}

export function writeLocalStorageJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore blocked or full storage so UI state keeps working.
  }
}

export function removeLocalStorageEntry(key: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore blocked storage so cleanup never breaks the page.
  }
}
