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

  return (
    <PageError
      title={t.common.somethingWentWrong}
      detail={error.message || t.stockIn.loadingError}
      retryLabel={t.common.tryAgain}
      onRetry={reset}
    />
  );
}
