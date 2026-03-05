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
  const fallbackMessage = t?.transactions?.loadingError || "An unexpected error occurred";
  const fallbackTitle = t?.common?.somethingWentWrong || "Something went wrong";
  const retryLabel = t?.common?.tryAgain || "Try again";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{fallbackTitle}</h2>
        <p className="text-gray-600 mb-6">{error.message || fallbackMessage}</p>
        <button
          onClick={() => reset()}
          className="bg-[#6B21A8] hover:bg-[#5B1A98] text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
