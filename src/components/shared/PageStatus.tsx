"use client";

export function PageLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 rounded-full border-2 border-hairline border-t-brand" />
        <p className="text-sm text-ink-2">{label}</p>
      </div>
    </div>
  );
}

export function PageError({
  title,
  detail,
  retryLabel,
  onRetry,
}: {
  title: string;
  detail: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="mx-auto max-w-md p-6 text-center">
        <h2 className="mb-2 text-[28px] font-medium leading-[1.15] text-ink">{title}</h2>
        <p className="mb-6 text-sm text-ink-2">{detail}</p>
        <button
          type="button"
          onClick={onRetry}
          className="h-10 rounded-lg bg-brand px-5 text-sm font-medium text-white transition-colors duration-150 ease-craft hover:bg-brand-hover"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}
