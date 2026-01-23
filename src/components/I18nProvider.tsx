"use client";

import { I18nProvider as BaseI18nProvider } from "@/lib/i18n/index";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <BaseI18nProvider>{children}</BaseI18nProvider>;
}
