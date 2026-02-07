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

export default function NewTeamPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-bold text-base sm:text-lg md:text-xl text-gray-900 tracking-tight truncate">
            PURPLE STOCK
          </span>
        </div>
        <Link
          href="/team_selection"
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all font-medium text-xs sm:text-sm touch-manipulation min-h-[36px] sm:min-h-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t.team.createTitle}
            </h1>
            <p className="text-gray-600">
              {t.team.createSubtitle}
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <Alert className="mb-6 border-l-4 border-l-green-500 bg-green-50/50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600 text-sm">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-6 border-l-4 border-l-red-500 bg-red-50/50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-600 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900">
                Team Name <span className="text-red-500">*</span>
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
              <p className="text-xs text-gray-500">
                Choose a unique name for your team
              </p>
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-900">
                Notes (Optional)
              </Label>
              <textarea
                id="notes"
                placeholder="Add any notes about this team..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={4}
              />
              <p className="text-xs text-gray-500">
                Add any additional information about this team
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white font-semibold px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                {isLoading ? t.team.creating : t.team.createAction}
                </Button>
              <Link href="/team_selection">
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
