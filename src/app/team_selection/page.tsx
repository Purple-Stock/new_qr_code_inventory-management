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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">4</span>
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setLanguage("en")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                language === "en"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                language === "pt-BR"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("fr")}
              className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                language === "fr"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              FR
            </button>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all font-medium text-sm"
          >
            <span>Sign Out</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6 relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-md">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-lg">Select Team</h2>
              <p className="text-xs text-gray-500 font-medium">Choose a team</p>
            </div>
          </div>
          <button className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-[#6B21A8] transition-all">
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-4 rounded-lg flex items-center gap-3 shadow-sm">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 text-sm font-medium">
                Signed in successfully.
              </span>
              <button
                onClick={() => setShowSuccess(false)}
                className="ml-auto text-green-600 hover:text-green-800 font-bold text-lg leading-none"
              >
                ×
              </button>
            </div>
          )}

          {/* Header Section */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <h1 className="text-4xl font-bold text-gray-900">
                  Select a Team
                </h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm">
                  <Info className="h-4 w-4" />
                  Tutorial
                </button>
              </div>
              <p className="text-gray-600 text-lg">
                Manage your teams or create a new one to get started
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/teams/new">
                <Button
                  className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white border-0 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </Link>
            </div>
          </div>

          {/* Teams Grid */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6B21A8] border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading teams...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-lg border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="h-10 w-10 text-purple-600" />
              </div>
              <p className="text-gray-700 text-xl font-semibold mb-2">No teams found</p>
              <p className="text-gray-500 mb-6">Get started by creating your first team</p>
              <Link href="/teams/new">
                <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all">
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
