"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Info,
  MapPin,
  FileText,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { useTranslation } from "@/lib/i18n";

export default function NewLocationPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useParams();
  const teamId = params?.id as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [team, setTeam] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (teamId) {
      fetchTeam();
    }
  }, [teamId]);

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${teamId}`);
      const data = await response.json();
      if (response.ok) {
        setTeam(data.team);
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(t.locationForm.nameRequired);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/teams/${teamId}/locations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred while creating the location");
        setIsLoading(false);
        return;
      }

      setSuccess(t.locationForm.createSuccess);

      // Redirect to locations list after 1.5 seconds
      setTimeout(() => {
        router.push(`/teams/${teamId}/locations`);
      }, 1500);
    } catch (err) {
      setError(t.locationForm.unexpectedError);
      setIsLoading(false);
    }
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">{t.locationForm.loadingTeam}</p>
      </div>
    );
  }

  return (
    <TeamLayout team={team} activeMenuItem="locations">
      <div className="max-w-2xl">
            {/* Page Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href={`/teams/${teamId}/locations`}>
                  <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-600" />
                  </button>
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t.locations.newLocation}
                </h1>
              </div>
              <Button
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Info className="h-4 w-4 mr-2" />
                Tutorial
              </Button>
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
              <Alert
                variant="destructive"
                className="mb-6 border-l-4 border-l-red-500 bg-red-50/50"
              >
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600 text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                {/* Name Field */}
                <div className="space-y-2 mb-6">
                  <Label htmlFor="name" className="text-gray-900">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter location name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10"
                      required
                      maxLength={255}
                    />
                  </div>
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-gray-900">
                    Description
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                      id="description"
                      placeholder="Enter location description (optional)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white font-semibold px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t.locationForm.creating : t.locationForm.createAction}
                </Button>
                <Link href={`/teams/${teamId}/locations`}>
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
    </TeamLayout>
  );
}
