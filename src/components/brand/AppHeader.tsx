"use client";

import { LogOut } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { BrandMark } from "./BrandMark";
import { LanguageSwitch } from "./LanguageSwitch";

export function AppHeader({
  leading,
  onSignOut,
}: {
  leading?: React.ReactNode;
  onSignOut: () => void;
}) {
  const { t } = useTranslation();

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-hairline bg-white px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        <BrandMark size={28} className="shrink-0 text-brand" />
        <span className="truncate text-base font-medium text-ink">Purple Stock</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LanguageSwitch />
        <button
          type="button"
          onClick={onSignOut}
          className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-2 transition-colors duration-150 ease-craft hover:bg-raised hover:text-ink sm:px-3 sm:text-sm"
        >
          <span className="hidden sm:inline">{t.common.signOut}</span>
          <span className="sm:hidden">{t.common.signOutShort}</span>
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
