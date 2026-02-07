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
  UserPlus,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";
import { isValidEmail } from "@/lib/validation";
import { AddUserToTeamsModal } from "@/components/AddUserToTeamsModal";
import Link from "next/link";

interface Team {
  id: number;
  name: string;
  notes: string | null;
}

interface ManagedUser {
  userId: number;
  email: string;
  role: "admin" | "operator" | "viewer";
}

export default function SettingsPage() {
  const router = useRouter();
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isMemberSaving, setIsMemberSaving] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; email: string }>>([]);
  const [companyTeams, setCompanyTeams] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [memberEmail, setMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<ManagedUser["role"]>("viewer");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"users" | "password">("users");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { language, setLanguage, t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setCurrentUserId(parseInt(storedUserId, 10));
    }

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
      }

      const storedUserId = localStorage.getItem("userId");
      if (storedUserId) {
        await fetchManagedUsers(parseInt(storedUserId, 10));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagedUsers = async (userId: number) => {
    try {
      setIsUsersLoading(true);
      const response = await fetch(`/api/teams/${teamId}/users`, {
        headers: {
          "x-user-id": String(userId),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        setCanManageUsers(false);
        setManagedUsers([]);
        setAvailableUsers([]);
        return;
      }

      setCanManageUsers(true);
      setManagedUsers(data.members || []);
      setAvailableUsers(data.availableUsers || []);
      setCompanyTeams(data.companyTeams || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  const handleUserRoleChange = async (
    managedUserId: number,
    role: ManagedUser["role"]
  ) => {
    if (!currentUserId) {
      toast({
        title: t.common.error,
        description: t.settings.userNotAuthenticated,
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/teams/${teamId}/users/${managedUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUserId),
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      if (!response.ok) {
        toast({
          title: t.common.error,
          description: data.error || t.settings.couldNotUpdateRole,
          variant: "destructive",
        });
        return;
      }

      setManagedUsers((prev) =>
        prev.map((user) =>
          user.userId === managedUserId ? { ...user, role: data.member.role } : user
        )
      );

      toast({
        title: t.common.success,
        description: t.settings.roleUpdatedSuccessfully,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.couldNotUpdateRole,
        variant: "destructive",
      });
    }
  };

  const handleAddMember = async () => {
    if (!currentUserId || (!selectedUserId && !memberEmail.trim())) {
      return;
    }

    if (memberEmail.trim() && !isValidEmail(memberEmail)) {
      toast({
        title: t.common.error,
        description: t.settings.invalidEmailFormat,
        variant: "destructive",
      });
      return;
    }

    setIsMemberSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUserId),
        },
        body: JSON.stringify({
          userId: selectedUserId ? parseInt(selectedUserId, 10) : undefined,
          email: memberEmail.trim() || undefined,
          role: newMemberRole,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: t.common.error,
          description: data.error || t.settings.couldNotAddMember,
          variant: "destructive",
        });
        return;
      }

      await fetchManagedUsers(currentUserId);
      setSelectedUserId("");
      setMemberEmail("");
      setNewMemberRole("viewer");
      toast({
        title: t.common.success,
        description: t.settings.memberAddedSuccessfully,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.couldNotAddMember,
        variant: "destructive",
      });
    } finally {
      setIsMemberSaving(false);
    }
  };

  const handleRemoveMember = async (managedUserId: number) => {
    if (!currentUserId) {
      return;
    }

    setIsMemberSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/users/${managedUserId}`, {
        method: "DELETE",
        headers: {
          "x-user-id": String(currentUserId),
        },
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: t.common.error,
          description: data.error || t.settings.couldNotRemoveMember,
          variant: "destructive",
        });
        return;
      }

      await fetchManagedUsers(currentUserId);
      toast({
        title: t.common.success,
        description: t.settings.memberRemovedSuccessfully,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.couldNotRemoveMember,
        variant: "destructive",
      });
    } finally {
      setIsMemberSaving(false);
    }
  };

  const handleCreateUserAndAddMember = async (payload: {
    email: string;
    password: string;
    role: ManagedUser["role"];
    teamIds: number[];
  }) => {
    if (!currentUserId) {
      return;
    }
    if (!isValidEmail(payload.email)) {
      toast({
        title: t.common.error,
        description: t.settings.invalidEmailFormat,
        variant: "destructive",
      });
      return;
    }
    if (payload.password.length < 6) {
      toast({
        title: t.common.error,
        description: t.settings.passwordMinLength,
        variant: "destructive",
      });
      return;
    }
    if (payload.teamIds.length === 0) {
      toast({
        title: t.common.error,
        description: t.settings.selectAtLeastOneTeam,
        variant: "destructive",
      });
      return;
    }

    setIsMemberSaving(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUserId),
        },
        body: JSON.stringify({
          email: payload.email,
          password: payload.password,
          role: payload.role,
          teamIds: payload.teamIds,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast({
          title: t.common.error,
          description: data.error || t.settings.couldNotCreateUser,
          variant: "destructive",
        });
        return;
      }

      await fetchManagedUsers(currentUserId);
      setIsAddUserModalOpen(false);
      toast({
        title: t.common.success,
        description: t.settings.userCreatedAndAdded,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.couldNotCreateUser,
        variant: "destructive",
      });
    } finally {
      setIsMemberSaving(false);
    }
  };

  const handleUpdateCurrentUserPassword = async () => {
    if (!currentUserId) {
      toast({
        title: t.common.error,
        description: t.settings.userNotAuthenticated,
        variant: "destructive",
      });
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: t.common.error,
        description: t.settings.requiredPasswordFields,
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t.common.error,
        description: t.settings.passwordMinLength,
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: t.common.error,
        description: t.settings.passwordsDoNotMatch,
        variant: "destructive",
      });
      return;
    }

    if (newPassword === currentPassword) {
      toast({
        title: t.common.error,
        description: t.settings.newPasswordMustDiffer,
        variant: "destructive",
      });
      return;
    }

    setIsPasswordSaving(true);
    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUserId),
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMessage =
          data.error === "Current password is incorrect"
            ? t.settings.currentPasswordIncorrect
            : data.error || t.settings.couldNotUpdatePassword;
        toast({
          title: t.common.error,
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        title: t.common.success,
        description: t.settings.passwordUpdatedSuccessfully,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.couldNotUpdatePassword,
        variant: "destructive",
      });
    } finally {
      setIsPasswordSaving(false);
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
              <h2 className="text-lg font-bold text-gray-900">{team?.name || t.settings.teamFallback}</h2>
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
            <h2 className="text-lg font-bold text-gray-900">{team?.name || t.settings.teamFallback}</h2>
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

          <div className="mb-4 sm:mb-6 border-b border-gray-200">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveSettingsTab("users")}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSettingsTab === "users"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.settings.usersPermissionsTab}
              </button>
              <button
                type="button"
                onClick={() => setActiveSettingsTab("password")}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSettingsTab === "password"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                {t.settings.changePasswordTab}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t.settings.loading}</p>
            </div>
          ) : (
            <>
              {activeSettingsTab === "users" ? canManageUsers ? (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {t.settings.usersPermissionsTitle}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4 sm:mb-6">
                    {t.settings.usersPermissionsSubtitle}
                  </p>

                  <div className="mb-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t.settings.addUserMultiTeam}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_180px_auto] gap-2 mb-4">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                    >
                      <option value="">{t.settings.selectUserToAdd}</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.email}
                        </option>
                      ))}
                    </select>

                    <Input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder={t.settings.orAddByEmail}
                      className="h-10"
                    />

                    <select
                      value={newMemberRole}
                      onChange={(e) =>
                        setNewMemberRole(e.target.value as ManagedUser["role"])
                      }
                      className="h-10 rounded-md border border-gray-300 px-3 text-sm"
                    >
                      <option value="admin">{t.settings.roleAdmin}</option>
                      <option value="operator">{t.settings.roleOperator}</option>
                      <option value="viewer">{t.settings.roleViewer}</option>
                    </select>

                    <Button
                      type="button"
                      onClick={handleAddMember}
                      disabled={(!selectedUserId && !memberEmail.trim()) || isMemberSaving}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t.settings.add}
                    </Button>
                  </div>

                  {isUsersLoading ? (
                    <p className="text-sm text-gray-600">{t.settings.loadingUsers}</p>
                  ) : managedUsers.length === 0 ? (
                    <p className="text-sm text-gray-600">{t.settings.noUsersFound}</p>
                  ) : (
                    <div className="space-y-3">
                      {managedUsers.map((managedUser) => {
                        const adminCount = managedUsers.filter(
                          (member) => member.role === "admin"
                        ).length;
                        const isLastAdmin =
                          managedUser.role === "admin" && adminCount === 1;

                        return (
                          <div
                            key={managedUser.userId}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border border-gray-200 rounded-lg"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {managedUser.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                {t.settings.memberIdLabel}: {managedUser.userId}
                              </p>
                              {isLastAdmin && (
                                <p className="text-xs text-amber-600 mt-1">
                                  {t.settings.lastTeamAdmin}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={managedUser.role}
                                onChange={(e) =>
                                  handleUserRoleChange(
                                    managedUser.userId,
                                    e.target.value as ManagedUser["role"]
                                  )
                                }
                                disabled={isLastAdmin || isMemberSaving}
                                className="h-10 rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                              >
                                <option value="admin">{t.settings.roleAdmin}</option>
                                <option value="operator">{t.settings.roleOperator}</option>
                                <option value="viewer">{t.settings.roleViewer}</option>
                              </select>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleRemoveMember(managedUser.userId)}
                                disabled={isMemberSaving || isLastAdmin}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {t.settings.usersPermissionsTitle}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t.settings.noPermissionManageMembers}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <KeyRound className="h-5 w-5 text-purple-600" />
                    {t.settings.changePasswordTitle}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4 sm:mb-6">
                    {t.settings.changePasswordSubtitle}
                  </p>

                  <div className="grid grid-cols-1 gap-3 max-w-xl">
                    <div className="relative">
                      <Input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t.settings.currentPasswordPlaceholder}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={
                          showCurrentPassword
                            ? t.settings.hidePassword
                            : t.settings.showPassword
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t.settings.newPasswordPlaceholder}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={
                          showNewPassword
                            ? t.settings.hidePassword
                            : t.settings.showPassword
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t.settings.confirmPasswordPlaceholder}
                        className="h-10 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={
                          showConfirmPassword
                            ? t.settings.hidePassword
                            : t.settings.showPassword
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={handleUpdateCurrentUserPassword}
                      disabled={isPasswordSaving}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-fit"
                    >
                      {isPasswordSaving
                        ? t.settings.updatingPassword
                        : t.settings.updatePassword}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          <AddUserToTeamsModal
            isOpen={isAddUserModalOpen}
            isSaving={isMemberSaving}
            teams={companyTeams}
            onClose={() => setIsAddUserModalOpen(false)}
            onSubmit={handleCreateUserAndAddMember}
          />
        </main>
      </div>
    </div>
  );
}
