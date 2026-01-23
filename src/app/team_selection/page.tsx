"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  ChevronLeft,
  CheckCircle2,
  Info,
  Plus,
  LogOut,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/TeamCard";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  notes: string | null;
  createdAt: Date | number;
  itemCount: number;
  transactionCount: number;
}

export default function TeamSelectionPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState("pt-BR");
  const [showSuccess, setShowSuccess] = useState(true);

  useEffect(() => {
    // TODO: Get userId from session/auth
    // For now, using localStorage or query param
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      router.push("/");
      return;
    }

    fetchTeams(parseInt(userId, 10));
  }, [router]);

  const fetchTeams = async (userId: number) => {
    try {
      const response = await fetch(`/api/teams?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setTeams(data.teams || []);
      } else {
        console.error("Error fetching teams:", data.error);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    router.push("/");
  };

  const handleEdit = (id: number) => {
    // TODO: Implement edit functionality
    console.log("Edit team:", id);
  };

  const handleDelete = (id: number) => {
    // TODO: Implement delete functionality
    if (confirm("Tem certeza que deseja deletar este time?")) {
      console.log("Delete team:", id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-purple-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#6B21A8] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">4</span>
          </div>
          <span className="font-bold text-lg text-gray-900">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 py-1 text-sm ${
                language === "en"
                  ? "text-[#6B21A8] font-semibold"
                  : "text-gray-600"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`px-2 py-1 text-sm ${
                language === "pt-BR"
                  ? "text-[#6B21A8] font-semibold"
                  : "text-gray-600"
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("fr")}
              className={`px-2 py-1 text-sm ${
                language === "fr"
                  ? "text-[#6B21A8] font-semibold"
                  : "text-gray-600"
              }`}
            >
              FR
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-gray-700 hover:text-[#6B21A8] transition-colors"
          >
            <span className="text-sm">Sign Out</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <Home className="h-5 w-5 text-[#6B21A8]" />
            <div>
              <h2 className="font-semibold text-gray-900">Select Team</h2>
              <p className="text-xs text-gray-500">Choose a team</p>
            </div>
          </div>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-green-800 text-sm">
                Signed in successfully.
              </span>
              <button
                onClick={() => setShowSuccess(false)}
                className="ml-auto text-green-600 hover:text-green-800"
              >
                ×
              </button>
            </div>
          )}

          {/* Header Section */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  Select a Team
                </h1>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Info className="h-4 w-4" />
                  Tutorial
                </button>
              </div>
              <p className="text-gray-600">
                Manage your teams or create a new one to get started
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/teams/new">
                <Button
                  className="bg-white border-2 border-[#6B21A8] text-[#6B21A8] hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="border-[#6B21A8] text-[#6B21A8] hover:bg-purple-50"
              >
                Sign Out
              </Button>
            </div>
          </div>

          {/* Teams Grid */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No teams found</p>
              <Link href="/teams/new">
                <Button className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Team
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  id={team.id}
                  name={team.name}
                  createdAt={team.createdAt instanceof Date ? team.createdAt : new Date(team.createdAt)}
                  notes={team.notes}
                  itemCount={team.itemCount}
                  transactionCount={team.transactionCount}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
