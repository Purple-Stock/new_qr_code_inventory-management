import { fetchApiResult } from "@/lib/api-client";
import type { ToastVariant } from "@/components/ui/use-toast-simple";

interface LogoutAndRedirectOptions {
  message: string;
  title: string;
  toast: (options: {
    variant?: ToastVariant;
    title?: string;
    description?: string;
  }) => unknown;
  router: { push: (href: string) => void };
}

export async function logoutAndRedirectToLogin({
  message,
  title,
  toast,
  router,
}: LogoutAndRedirectOptions) {
  toast({
    variant: "destructive",
    title,
    description: message,
  });

  try {
    await fetchApiResult("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort logout. Local cleanup and redirect still proceed.
  }

  localStorage.removeItem("userId");
  localStorage.removeItem("userRole");
  router.push("/");
}
