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
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";

export default function EditLocationPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;
  const locationId = params?.locationId as string;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [team, setTeam] = useState<{ name: string } | null>(null);

  useEffect(() => {
    if (teamId && locationId) {
      fetchTeamAndLocation();
    }
  }, [teamId, locationId]);

  const fetchTeamAndLocation = async () => {
    try {
      // Fetch team
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
      }

      // Fetch location
      const locationResponse = await fetch(
        `/api/teams/${teamId}/locations/${locationId}`
      );
      const locationData = await locationResponse.json();
      if (locationResponse.ok) {
        setName(locationData.location.name);
        setDescription(locationData.location.description || "");
      } else {
        setError(locationData.error || "Failed to load location");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("An error occurred while loading the location");
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Location name is required");
      return;
    }

    setIsLoading(true);

    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(
        `/api/teams/${teamId}/locations/${locationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": userId || "",
          },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred while updating the location");
        setIsLoading(false);
        return;
      }

      setSuccess("Location updated successfully! Redirecting...");

      // Redirect to locations list after 1.5 seconds
      setTimeout(() => {
        router.push(`/teams/${teamId}/locations`);
      }, 1500);
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading location...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B21A8] rounded-lg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="font-bold text-lg text-gray-900">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-sm text-gray-700 hover:text-[#6B21A8] transition-colors">
            Subscribe
          </button>
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 text-sm text-[#6B21A8] font-semibold">
              EN
            </button>
            <button className="px-2 py-1 text-sm text-gray-600">PT</button>
            <button className="px-2 py-1 text-sm text-gray-600">FR</button>
          </div>
          <button className="flex items-center gap-2 text-gray-700 hover:text-[#6B21A8] transition-colors">
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6">
          {/* Team Selection */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  {team?.name || "Loading..."}
                </h3>
              </div>
            </div>
            <Link href="/team_selection">
              <button className="text-xs text-[#6B21A8] hover:underline">
                Change Team
              </button>
            </Link>
          </div>

          {/* Back Button */}
          <Link href={`/teams/${teamId}/locations`}>
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Locations
            </button>
          </Link>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
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
                  Edit Location.
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
                  {isLoading ? "Updating..." : "Update Location"}
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
        </main>
      </div>
    </div>
  );
}
