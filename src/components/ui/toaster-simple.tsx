"use client";

import { useToast } from "./use-toast-simple";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:flex-col md:max-w-[420px] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all animate-in slide-in-from-bottom-full",
            toast.variant === "destructive" &&
              "border-red-500 bg-red-50 text-red-900",
            toast.variant === "success" &&
              "border-green-500 bg-green-50 text-green-900",
            toast.variant === "default" &&
              "border bg-background text-foreground"
          )}
        >
          <div className="grid gap-1 flex-1">
            {toast.title && (
              <div className="flex items-center gap-2">
                {toast.variant === "success" && (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                {toast.variant === "destructive" && (
                  <AlertCircle className="h-5 w-5" />
                )}
                <div className="text-sm font-semibold">{toast.title}</div>
              </div>
            )}
            {toast.description && (
              <div className="text-sm opacity-90">{toast.description}</div>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
