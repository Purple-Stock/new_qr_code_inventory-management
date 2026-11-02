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
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/brand/AppHeader";
import { Button } from "@/components/ui/button";
import { ui } from "@/lib/ui";
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
  const { t } = useTranslation();
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
    { target: "tour-team-selection-tutorial", title: t.teamSelection.tourTutorialTitle, description: t.teamSelection.tourTutorialDesc },
    { target: "tour-team-selection-create", title: t.teamSelection.tourCreateTitle, description: t.teamSelection.tourCreateDesc },
    { target: "tour-team-selection-list", title: t.teamSelection.tourListTitle, description: t.teamSelection.tourListDesc },
    { target: "tour-team-selection-sidebar", title: t.teamSelection.tourSidebarTitle, description: t.teamSelection.tourSidebarDesc },
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
    <div className={ui.page}>
      <AppHeader onSignOut={handleSignOut} />

      <div className="flex flex-col lg:flex-row">
        <aside
          data-tour="tour-team-selection-sidebar"
          className={`relative hidden min-h-[calc(100vh-56px)] border-r border-hairline bg-white lg:block ${
            isSidebarCollapsed ? "w-16" : "w-64"
          }`}
        >
          <div className={`p-4 ${isSidebarCollapsed ? "px-2" : ""}`}>
            <div className={`mb-4 flex items-center gap-2 ${isSidebarCollapsed ? "justify-center" : ""}`}>
              <Home className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.5} />
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <h2 className="text-sm font-medium text-ink">{t.common.selectTeam}</h2>
                  <p className="text-xs text-ink-3">{t.common.chooseTeam}</p>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute right-0 top-1/2 z-10 flex h-7 w-7 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-hairline bg-white text-ink-3 hover:text-ink"
            aria-label={isSidebarCollapsed ? t.common.expandSidebar : t.common.collapseSidebar}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </aside>

        <main className="mx-auto w-full max-w-[1440px] flex-1 p-6 md:p-8">
          {showSuccess ? (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-hairline bg-white px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-positive" strokeWidth={1.5} />
              <span className="flex-1 text-sm text-ink-2">{t.teamSelection.signedInSuccess}</span>
              <button
                type="button"
                onClick={() => setShowSuccess(false)}
                className="text-ink-3 hover:text-ink"
                aria-label={t.common.close}
              >
                ×
              </button>
            </div>
          ) : null}

          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                <h1 className={ui.pageTitle}>{t.teamSelection.title}</h1>
                <button
                  type="button"
                  onClick={() => setIsTutorialOpen(true)}
                  data-tour="tour-team-selection-tutorial"
                  className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-white px-3 text-sm text-ink-2 hover:bg-raised hover:text-ink"
                >
                  <Info className="h-4 w-4" strokeWidth={1.5} />
                  {t.common.tutorial}
                </button>
              </div>
              <p className={ui.pageSub}>{t.teamSelection.subtitle}</p>
            </div>

            <Link href="/teams/new" className="w-full sm:w-auto" data-tour="tour-team-selection-create">
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                <span className="hidden sm:inline">{t.teamSelection.createTeam}</span>
                <span className="sm:hidden">{t.teamSelection.createTeamShort}</span>
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="py-16 text-center">
              <div className="mb-4 inline-block h-8 w-8 rounded-full border-2 border-hairline border-t-brand" />
              <p className="text-sm text-ink-2">{t.teamSelection.loadingTeams}</p>
            </div>
          ) : teams.length === 0 ? (
            <div data-tour="tour-team-selection-list" className={ui.empty}>
              <div className={ui.emptyMark}>
                <Users className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <p className="mb-1 text-base font-medium text-ink">{t.teamSelection.noTeams}</p>
              <p className="mb-6 text-sm text-ink-3">{t.teamSelection.noTeamsMessage}</p>
              <Link href="/teams/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {t.teamSelection.createFirstTeam}
                </Button>
              </Link>
            </div>
          ) : (
            <div data-tour="tour-team-selection-list" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <EditTeamModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingTeam(null);
        }}
        team={editingTeam}
        onSuccess={handleEditSuccess}
      />

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
