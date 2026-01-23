"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Home,
  MapPin,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Move,
  FileText,
  BarChart3,
  Tag,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  notes: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (teamId) {
      fetchData();
    }
  }, [teamId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const teamResponse = await fetch(`/api/teams/${teamId}`);
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeam(teamData.team);
        setName(teamData.team.name || "");
        setNotes(teamData.team.notes || "");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (!name.trim()) {
      toast({
        title: t.settings.errorSaving,
        description: t.settings.teamNameRequired,
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: "PUT",
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
        toast({
          title: t.settings.errorSaving,
          description: data.error || t.settings.errorSaving,
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      toast({
        title: t.settings.changesSaved,
        description: "",
      });

      // Update local team state
      setTeam(data.team);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t.settings.errorSaving,
        description: t.settings.errorSaving,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { icon: Home, label: t.menu.itemList, href: `/teams/${teamId}/items` },
    { icon: MapPin, label: t.menu.locations, href: `/teams/${teamId}/locations` },
    { icon: ArrowUp, label: t.menu.stockIn, href: `/teams/${teamId}/stock-in` },
    { icon: ArrowDown, label: t.menu.stockOut, href: `/teams/${teamId}/stock-out` },
    { icon: RotateCcw, label: t.menu.adjust, href: `/teams/${teamId}/adjust` },
    { icon: Move, label: t.menu.move, href: `/teams/${teamId}/move` },
    { icon: FileText, label: t.menu.transactions, href: `/teams/${teamId}/transactions` },
    { icon: BarChart3, label: t.menu.stockByLocation, href: `/teams/${teamId}/stock-by-location` },
    { icon: Tag, label: t.menu.labels, href: `/teams/${teamId}/labels` },
    { icon: FileBarChart, label: t.menu.reports, href: `/teams/${teamId}/reports` },
    { icon: Settings, label: t.menu.settings, href: `/teams/${teamId}/settings`, active: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-xs sm:text-sm font-bold">PS</span>
          </div>
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 hidden sm:block">
            PURPLE STOCK
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
          <button
            onClick={() => setLanguage("en")}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0 ${
              language === "en"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("pt-BR")}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0 ${
              language === "pt-BR"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            PT
          </button>
          <button
            onClick={() => setLanguage("fr")}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0 ${
              language === "fr"
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            FR
          </button>
          <button
            onClick={handleSignOut}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs sm:text-sm font-medium transition-colors touch-manipulation min-h-[40px] sm:min-h-0"
          >
            <span className="hidden sm:inline">{t.common.signOut}</span>
            <span className="sm:hidden">{t.common.signOutShort}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside
          className={`bg-white min-h-[calc(100vh-73px)] border-r border-gray-200 p-6 shadow-sm transition-all duration-300 ${
            isSidebarCollapsed ? "w-20" : "w-64"
          } hidden lg:block`}
        >
          <div className="flex items-center justify-between mb-6">
            {!isSidebarCollapsed && (
              <h2 className="text-lg font-bold text-gray-900">{team?.name || "Team"}</h2>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isSidebarCollapsed ? (
                <X className="h-5 w-5 text-gray-600" />
              ) : (
                <X className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      item.active
                        ? "bg-purple-100 text-purple-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isSidebarCollapsed && <span className="text-sm">{item.label}</span>}
                  </Link>
                );
              }
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed opacity-50 ${
                    item.active ? "bg-purple-100 text-purple-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isSidebarCollapsed && <span className="text-sm">{item.label}</span>}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        {isMobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed top-[73px] left-0 h-[calc(100vh-73px)] bg-white border-r border-gray-200 p-6 shadow-lg z-50 transition-transform duration-300 lg:hidden ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">{team?.name || "Team"}</h2>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              if (item.href) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      item.active
                        ? "bg-purple-100 text-purple-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              }
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-not-allowed opacity-50 ${
                    item.active ? "bg-purple-100 text-purple-700 font-semibold" : "text-gray-700"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden mb-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              {t.settings.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">{t.settings.subtitle}</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t.settings.loading}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Team Information */}
              <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">
                  {t.settings.teamInformation}
                </h2>

                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700 mb-2 block">
                      {t.settings.teamName} *
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.settings.teamNamePlaceholder}
                      className="w-full"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-sm font-semibold text-gray-700 mb-2 block">
                      {t.settings.notes}
                    </Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={t.settings.notesPlaceholder}
                      className="w-full min-h-[120px]"
                      rows={4}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-medium rounded-lg transition-colors touch-manipulation min-h-[40px] sm:min-h-0"
                >
                  {isSaving ? (
                    <>
                      <span className="mr-2">{t.common.loading}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                      {t.settings.saveChanges}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
