"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ui } from "@/lib/ui";

interface FormPageShellProps {
  title: string;
  backHref: string;
  tutorialLabel: string;
  onTutorialClick?: () => void;
  tutorialTourId?: string;
  success?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormPageShell({
  title,
  backHref,
  tutorialLabel,
  onTutorialClick,
  tutorialTourId,
  success,
  error,
  children,
}: FormPageShellProps) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-2 hover:bg-raised hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
          <h1 className={ui.pageTitle}>{title}</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onTutorialClick}
          data-tour={tutorialTourId}
        >
          <Info className="mr-2 h-4 w-4" strokeWidth={1.5} />
          {tutorialLabel}
        </Button>
      </div>

      {success ? (
        <Alert className="mb-6 border-hairline bg-white">
          <CheckCircle2 className="h-4 w-4 text-positive" strokeWidth={1.5} />
          <AlertDescription className="text-sm text-ink-2">{success}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mb-6 rounded-lg border-hairline bg-red-50">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      ) : null}

      {children}
    </div>
  );
}
