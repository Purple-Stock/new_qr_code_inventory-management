"use client";

import { useTranslation, type Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const LOCALES: { id: Language; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "pt-BR", label: "PT" },
  { id: "fr", label: "FR" },
];

export function LanguageSwitch({ className }: { className?: string }) {
  const { language, setLanguage } = useTranslation();

  return (
    <div
      className={cn("flex items-center gap-0.5 rounded-lg bg-raised p-0.5", className)}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((locale) => {
        const active = language === locale.id;
        return (
          <button
            key={locale.id}
            type="button"
            onClick={() => setLanguage(locale.id)}
            className={cn(
              "h-8 min-w-[36px] rounded-md px-2 text-xs transition-colors duration-150 ease-craft",
              active ? "bg-white font-medium text-brand shadow-rest" : "text-ink-2 hover:text-ink"
            )}
          >
            {locale.label}
          </button>
        );
      })}
    </div>
  );
}
