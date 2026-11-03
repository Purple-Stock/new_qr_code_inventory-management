"use client";

import { useTranslation } from "@/lib/i18n";
import { PageLoading } from "@/components/shared/PageStatus";

export default function Loading() {
  const { t } = useTranslation();

  return <PageLoading label={t.stockOut.loadingPage} />;
}
