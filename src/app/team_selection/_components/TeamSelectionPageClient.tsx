"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
  Plus,
  LogOut,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TeamCard } from "@/components/TeamCard";
import { EditTeamModal } from "@/components/EditTeamModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";
import { fetchApiResult } from "@/lib/api-client";
import type { TeamDto } from "@/lib/services/types";
import Link from "next/link";

type Team = TeamDto;

export default function TeamSelectionPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useTranslation();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const tourSteps: TourStep[] = [
    { target: "tour-team-selection-tutorial", title: t.common.tutorial, description: t.teamSelection.subtitle },
    { target: "tour-team-selection-create", title: t.teamSelection.createTeam, description: t.teamSelection.subtitle },
    { target: "tour-team-selection-list", title: t.teamSelection.title, description: t.teamSelection.noTeamsMessage },
    { target: "tour-team-selection-sidebar", title: t.common.selectTeam, description: t.common.chooseTeam },
  ];

  useEffect(() => {
    fetchTeams();
  }, [router]);

  const fetchTeams = async () => {
    try {
      const parsed = await fetchApiResult<{ teams?: Team[] }>("/api/teams", {
        fallbackError: "Error fetching teams",
      });

      if (parsed.ok) {
        setTeams(parsed.data.teams || []);
      } else if (parsed.error.status === 401) {
        router.push("/");
      } else {
        console.error("Error fetching teams:", parsed.error.error);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await fetchApiResult("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const handleEdit = (id: number) => {
    const team = teams.find((t) => t.id === id);
    if (team) {
      setEditingTeam(team);
      setIsEditModalOpen(true);
    }
  };

  const handleEditSuccess = () => {
    fetchTeams();
  };

  const handleDeleteClick = (id: number) => {
    const team = teams.find((t) => t.id === id);
    if (team?.canDeleteTeam) {
      setTeamToDelete(team);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!teamToDelete) return;

    setDeletingTeamId(teamToDelete.id);

    try {
      const parsed = await fetchApiResult(`/api/teams/${teamToDelete.id}`, {
        method: "DELETE",
        fallbackError: t.teamSelection.errorDeleting,
      });
      if (!parsed.ok) {
        toast({
          title: t.teamSelection.errorDeleting,
          description: t.teamSelection.errorDeleting,
          variant: "destructive",
        });
        setDeletingTeamId(null);
        return;
      }

      toast({
        title: t.teamSelection.teamDeleted,
        description: "",
        variant: "success",
      });

      fetchTeams();

      // Close modal
      setDeleteModalOpen(false);
      setTeamToDelete(null);
    } catch (error) {
      console.error("Error deleting team:", error);
      toast({
        title: t.teamSelection.errorDeleting,
        description: t.teamSelection.errorDeleting,
        variant: "destructive",
      });
    } finally {
      setDeletingTeamId(null);
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
          <span className="font-bold text-base sm:text-lg md:text-xl text-gray-900 tracking-tight truncate">PURPLE STOCK</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
            <button
              onClick={() => setLanguage("en")}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
                language === "en"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("pt-BR")}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
                language === "pt-BR"
                  ? "bg-white text-[#6B21A8] font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              PT
            </button>
            <button
              onClick={() => setLanguage("fr")}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-all touch-manipulation min-h-[36px] sm:min-h-0 ${
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
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-[#6B21A8] hover:bg-purple-50 rounded-lg transition-all font-medium text-xs sm:text-sm touch-manipulation min-h-[36px] sm:min-h-0"
          >
            <span className="hidden sm:inline">{t.common.signOut}</span>
            <span className="sm:hidden">{t.common.signOutShort}</span>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside data-tour="tour-team-selection-sidebar" className={`hidden lg:block bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 relative transition-all duration-300 ${
          isSidebarCollapsed ? "w-20" : "w-64"
        }`}>
          <div className={`p-6 transition-all duration-300 ${isSidebarCollapsed ? "px-4" : ""}`}>
            <div className={`flex items-center gap-3 mb-8 ${isSidebarCollapsed ? "justify-center" : ""}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-[#6B21A8] to-[#7C3AED] rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
              <Home className="h-5 w-5 text-white" />
            </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-lg">{t.common.selectTeam}</h2>
              <p className="text-xs text-gray-500 font-medium">{t.common.chooseTeam}</p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-[#6B21A8] transition-all z-10 touch-manipulation"
            aria-label={isSidebarCollapsed ? t.common.expandSidebar : t.common.collapseSidebar}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
            )}
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {/* Success Message */}
          {showSuccess && (
            <div className="mb-4 sm:mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-3 shadow-sm">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 text-xs sm:text-sm font-medium flex-1">
                {t.teamSelection.signedInSuccess}
              </span>
              <button
                onClick={() => setShowSuccess(false)}
                className="text-green-600 hover:text-green-800 font-bold text-lg sm:text-xl leading-none touch-manipulation min-w-[24px] min-h-[24px] flex items-center justify-center"
                aria-label={t.common.close}
              >
                ×
              </button>
            </div>
          )}

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
                  {t.teamSelection.title}
                </h1>
                <button
                  onClick={() => setIsTutorialOpen(true)}
                  data-tour="tour-team-selection-tutorial"
                  className="flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm touch-manipulation min-h-[40px] sm:min-h-0 w-full sm:w-auto"
                >
                  <Info className="h-4 w-4" />
                  {t.common.tutorial}
                </button>
              </div>
              <p className="text-gray-600 text-sm sm:text-base md:text-lg">
                {t.teamSelection.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Link href="/teams/new" className="w-full sm:w-auto" data-tour="tour-team-selection-create">
                <Button
                  className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white border-0 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto touch-manipulation min-h-[48px] sm:min-h-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t.teamSelection.createTeam}</span>
                  <span className="sm:hidden">{t.teamSelection.createTeamShort}</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Teams Grid */}
          {isLoading ? (
            <div className="text-center py-12 sm:py-20">
              <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-[#6B21A8] border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-base sm:text-lg font-medium">{t.teamSelection.loadingTeams}</p>
            </div>
          ) : teams.length === 0 ? (
            <div data-tour="tour-team-selection-list" className="text-center py-12 sm:py-20 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 px-4 sm:px-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Users className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" />
              </div>
              <p className="text-gray-700 text-lg sm:text-xl font-semibold mb-2">{t.teamSelection.noTeams}</p>
              <p className="text-gray-500 text-sm sm:text-base mb-4 sm:mb-6">{t.teamSelection.noTeamsMessage}</p>
              <Link href="/teams/new">
                <Button className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white shadow-lg hover:shadow-xl transition-all touch-manipulation min-h-[48px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {t.teamSelection.createFirstTeam}
                </Button>
              </Link>
            </div>
          ) : (
            <div data-tour="tour-team-selection-list" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {teams.map((team) => (
                <TeamCard
                  key={team.id}
                  id={team.id}
                  name={team.name}
                  createdAt={team.createdAt}
                  notes={team.notes}
                  itemCount={team.itemCount}
                  transactionCount={team.transactionCount}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  canDelete={team.canDeleteTeam}
                  isDeleting={deletingTeamId === team.id}
                />
              ))}
            </div>
          )}
        </main>
      </div>
      <TutorialTour
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        steps={tourSteps}
      />

      {/* Edit Team Modal */}
      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeam(null);
        }}
        team={editingTeam}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTeamToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={t.teamSelection.deleteTeam}
        itemName={teamToDelete?.name}
        isDeleting={deletingTeamId !== null}
      />
    </div>
  );
}
