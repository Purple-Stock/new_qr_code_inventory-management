"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n";
import { fetchApiJsonResult, fetchApiResult } from "@/lib/api-client";
import { AppHeader } from "@/components/brand/AppHeader";
import { ui } from "@/lib/ui";

export default function NewTeamPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    await fetchApiResult("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(t.team.teamNameRequired);
      return;
    }

    setIsLoading(true);

    try {
      const result = await fetchApiJsonResult("/api/teams", {
        method: "POST",
        body: {
          name: name.trim(),
          notes: notes.trim() || null,
        },
        fallbackError: t.team.unexpectedError,
      });

      if (!result.ok) {
        if (result.error.status === 401) {
          router.push("/");
          return;
        }
        setError(t.team.unexpectedError);
        setIsLoading(false);
        return;
      }

      setSuccess(t.team.createSuccess);
      router.push("/team_selection");
    } catch (err) {
      setError(t.team.unexpectedError);
      setIsLoading(false);
    }
  };

  return (
    <div className={ui.page}>
      <AppHeader
        onSignOut={handleSignOut}
        leading={
          <Link
            href="/team_selection"
            className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-raised hover:text-ink"
            aria-label={t.common.back}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        }
      />

      <main className="mx-auto max-w-2xl p-6 md:p-8">
        <div className={`${ui.card} p-8`}>
          <div className="mb-8">
            <h1 className={ui.pageTitle}>{t.team.createTitle}</h1>
            <p className={`${ui.pageSub} mt-1`}>{t.team.createSubtitle}</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-ink">
                {t.team.teamName} <span className="text-negative">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder={t.team.teamNamePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                required
                maxLength={255}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-ink">
                {t.team.notes}
              </Label>
              <textarea
                id="notes"
                placeholder={t.team.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px] w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                rows={4}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t.team.creating : t.team.createAction}
              </Button>
              <Link href="/team_selection">
                <Button type="button" variant="outline">
                  {t.common.cancel}
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
