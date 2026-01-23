import { useState, useCallback } from "react";

export type ToastVariant = "default" | "destructive" | "success";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

let toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function toast(options: {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}) {
  const id = Math.random().toString(36).substring(7);
  const newToast: Toast = {
    id,
    title: options.title,
    description: options.description,
    variant: options.variant || "default",
  };

  toasts = [newToast, ...toasts].slice(0, 1); // Limit to 1 toast
  notify();

  // Auto dismiss after 3 seconds
  setTimeout(() => {
    dismiss(id);
  }, 3000);

  return {
    id,
    dismiss: () => dismiss(id),
  };
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

import React from "react";

export function useToast() {
  const [state, setState] = useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setState(newToasts);
    };
    toastListeners.push(listener);
    setState([...toasts]);

    return () => {
      const index = toastListeners.indexOf(listener);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  return {
    toasts: state,
    toast,
    dismiss,
  };
}
