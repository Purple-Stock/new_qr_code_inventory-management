"use client";

import { useTranslation } from "@/lib/i18n";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.common.somethingWentWrong}</h2>
        <p className="text-gray-600 mb-6">{error.message || t.transactions.loadingError}</p>
        <button
          onClick={() => reset()}
          className="bg-[#6B21A8] hover:bg-[#5B1A98] text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {t.common.tryAgain}
        </button>
      </div>
    </div>
  );
}
