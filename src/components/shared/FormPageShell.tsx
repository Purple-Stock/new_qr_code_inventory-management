"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface FormPageShellProps {
  title: string;
  backHref: string;
  tutorialLabel: string;
  success?: string;
  error?: string;
  children: React.ReactNode;
}

export function FormPageShell({
  title,
  backHref,
  tutorialLabel,
  success,
  error,
  children,
}: FormPageShellProps) {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        </div>
        <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
          <Info className="h-4 w-4 mr-2" />
          {tutorialLabel}
        </Button>
      </div>

      {success && (
        <Alert className="mb-6 border-l-4 border-l-green-500 bg-green-50/50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 text-sm">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6 border-l-4 border-l-red-500 bg-red-50/50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-600 text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
}
