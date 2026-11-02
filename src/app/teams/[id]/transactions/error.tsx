"use client";

import { useTranslation } from "@/lib/i18n";
import { PageError } from "@/components/shared/PageStatus";

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
    <PageError
      title={fallbackTitle}
      detail={error.message || fallbackMessage}
      retryLabel={retryLabel}
      onRetry={reset}
    />
  );
}
