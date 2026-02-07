"use client";

import { useTranslation } from "@/lib/i18n";

export default function Loading() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6B21A8] border-t-transparent mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">{t.stockIn.loadingPage}</p>
      </div>
    </div>
  );
}
