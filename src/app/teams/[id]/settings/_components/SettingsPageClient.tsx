"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  UserPlus,
  Trash2,
  Pencil,
  KeyRound,
  Eye,
  EyeOff,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";
import { isValidEmail } from "@/lib/contracts/schemas";
import { AddUserToTeamsModal } from "@/components/AddUserToTeamsModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { ERROR_CODES } from "@/lib/errors";
import { fetchApiJsonResult, fetchApiResult } from "@/lib/api-client";
import type {
  AvailableUser,
  CompanyTeam,
  ManagedUser,
  ManagedUserRole,
  Team,
} from "../_types";

interface SettingsPageClientProps {
  teamId: number;
  initialTeam: Team;
}

export default function SettingsPageClient({
  teamId,
  initialTeam,
}: SettingsPageClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [isMemberSaving, setIsMemberSaving] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [companyTeams, setCompanyTeams] = useState<CompanyTeam[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"users" | "password" | "billing">(
    "users"
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const { t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [billingStatus, setBillingStatus] = useState<string | null>(
    initialTeam.stripeSubscriptionStatus ?? null
  );
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string | null>(
    initialTeam.stripeCurrentPeriodEnd ?? null
  );
  const hasStripeSubscription = Boolean(billingStatus);
  const hasActiveStripeSubscription = ["active", "trialing", "past_due"].includes(
    billingStatus ?? ""
  );
  const formattedPeriodEnd = billingPeriodEnd
    ? new Date(billingPeriodEnd).toLocaleDateString()
    : null;

  useEffect(() => {
    fetchManagedUsers().finally(() => setIsLoading(false));
  }, [teamId]);

  useEffect(() => {
    const billingResult = searchParams.get("billing");
    if (billingResult !== "success") {
      return;
    }

    const syncBilling = async () => {
      try {
        const syncResult = await fetchApiJsonResult<{
          synced: boolean;
          subscriptionStatus: string | null;
        }>(`/api/teams/${teamId}/billing/sync`, {
          method: "POST",
          fallbackError: "Could not sync billing status",
        });
        if (!syncResult.ok) {
          return;
        }

        setBillingStatus(syncResult.data.subscriptionStatus ?? null);

        const teamResult = await fetchApiResult<{
          team: { stripeCurrentPeriodEnd?: string | null };
        }>(`/api/teams/${teamId}`, {
          fallbackError: "Could not refresh team data",
        });
        if (teamResult.ok) {
          setBillingPeriodEnd(teamResult.data.team.stripeCurrentPeriodEnd ?? null);
        }
      } catch (error) {
        console.error("Error syncing billing status:", error);
      }
    };

    void syncBilling();
  }, [searchParams, teamId]);

  useEffect(() => {
    if (!canManageUsers && activeSettingsTab === "users") {
      setActiveSettingsTab("password");
    }
  }, [canManageUsers, activeSettingsTab]);

  const fetchManagedUsers = async () => {
    try {
      setIsUsersLoading(true);
      const parsed = await fetchApiResult<{
        currentUserId?: number;
        members?: ManagedUser[];
        availableUsers?: AvailableUser[];
        companyTeams?: CompanyTeam[];
      }>(`/api/teams/${teamId}/users`, { fallbackError: "Could not load users" });

      if (!parsed.ok) {
        setCanManageUsers(false);
        setManagedUsers([]);
        setAvailableUsers([]);
        return;
      }

      const data = parsed.data;
      setCanManageUsers(true);
      setCurrentUserId(data.currentUserId ?? null);
      setManagedUsers(data.members || []);
      setAvailableUsers(data.availableUsers || []);
      setCompanyTeams(data.companyTeams || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleUserRoleChange = async (
    managedUserId: number,
    role: ManagedUserRole
  ) => {
    try {
      const parsed = await fetchApiJsonResult<{ member: ManagedUser }>(
        `/api/teams/${teamId}/users/${managedUserId}`,
        {
        method: "PATCH",
          body: { role },
          fallbackError: t.settings.couldNotUpdateRole,
        },
      );
      if (!parsed.ok) {
        toast({
          title: t.common.error,
          description: t.settings.couldNotUpdateRole,
          variant: "destructive",
        });
        return;
      }

      setManagedUsers((prev) =>
        prev.map((user) =>
          user.userId === managedUserId ? { ...user, role: parsed.data.member.role } : user
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

  const handleRemoveMember = async (managedUserId: number) => {
    setIsMemberSaving(true);
    try {
      const parsed = await fetchApiResult(`/api/teams/${teamId}/users/${managedUserId}`, {
        method: "DELETE",
        fallbackError: t.settings.couldNotRemoveMember,
      });
      if (!parsed.ok) {
        toast({
          title: t.common.error,
          description: t.settings.couldNotRemoveMember,
          variant: "destructive",
        });
        return;
      }

      await fetchManagedUsers();
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
    role: ManagedUserRole;
    teamIds: number[];
  }) => {
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
      const parsed = await fetchApiJsonResult(`/api/teams/${teamId}/users`, {
        method: "POST",
        body: {
          email: payload.email,
          password: payload.password,
          role: payload.role,
          teamIds: payload.teamIds,
        },
        fallbackError: t.settings.couldNotCreateUser,
      });
      if (!parsed.ok) {
        toast({
          title: t.common.error,
          description: t.settings.couldNotCreateUser,
          variant: "destructive",
        });
        return;
      }

      await fetchManagedUsers();
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
      const parsed = await fetchApiJsonResult("/api/users/me/password", {
        method: "PATCH",
        body: {
          currentPassword,
          newPassword,
          confirmPassword,
        },
        fallbackError: t.settings.couldNotUpdatePassword,
      });
      if (!parsed.ok) {
        const errorMessage =
          parsed.error.errorCode === ERROR_CODES.CURRENT_PASSWORD_INCORRECT
            ? t.settings.currentPasswordIncorrect
            : t.settings.couldNotUpdatePassword;
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

  const openEditUserModal = (user: ManagedUser) => {
    setEditingUserId(user.userId);
    setEditUserEmail(user.email);
    setEditUserPassword("");
    setShowEditUserPassword(false);
    setIsEditUserModalOpen(true);
  };

  const closeEditUserModal = () => {
    setIsEditUserModalOpen(false);
    setEditingUserId(null);
    setEditUserEmail("");
    setEditUserPassword("");
    setShowEditUserPassword(false);
  };

  const handleUpdateManagedUserInfo = async () => {
    if (!editingUserId) {
      return;
    }

    const normalizedEmail = editUserEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      toast({
        title: t.common.error,
        description: t.settings.invalidEmailFormat,
        variant: "destructive",
      });
      return;
    }

    if (editUserPassword && editUserPassword.length < 6) {
      toast({
        title: t.common.error,
        description: t.settings.passwordMinLength,
        variant: "destructive",
      });
      return;
    }

    setIsMemberSaving(true);
    try {
      const parsed = await fetchApiJsonResult<{ member: ManagedUser }>(
        `/api/teams/${teamId}/users/${editingUserId}`,
        {
        method: "PATCH",
          body: {
          email: normalizedEmail,
          newPassword: editUserPassword || undefined,
          },
          fallbackError: t.settings.couldNotUpdateUserInfo,
        }
      );
      if (!parsed.ok) {
        const description =
          parsed.error.errorCode === ERROR_CODES.EMAIL_ALREADY_IN_USE
            ? t.settings.emailAlreadyInUse
            : t.settings.couldNotUpdateUserInfo;
        toast({
          title: t.common.error,
          description,
          variant: "destructive",
        });
        return;
      }

      setManagedUsers((prev) =>
        prev.map((user) =>
          user.userId === editingUserId
            ? {
                ...user,
                email: parsed.data.member.email ?? normalizedEmail,
                role: parsed.data.member.role ?? user.role,
              }
            : user
        )
      );

      toast({
        title: t.common.success,
        description: t.settings.userInfoUpdatedSuccessfully,
      });
      closeEditUserModal();
    } catch (error) {
      toast({
        title: t.common.error,
        description: t.settings.couldNotUpdateUserInfo,
        variant: "destructive",
      });
    } finally {
      setIsMemberSaving(false);
    }
  };

  const handleStartCheckout = async () => {
    setIsBillingLoading(true);
    try {
      const parsed = await fetchApiJsonResult<{ url: string }>(
        `/api/teams/${teamId}/billing/checkout`,
        {
          method: "POST",
          fallbackError: "Could not create checkout session",
        }
      );

      if (!parsed.ok) {
        toast({
          title: t.common.error,
          description: parsed.error.error,
          variant: "destructive",
        });
        return;
      }

      window.location.href = parsed.data.url;
    } catch (error) {
      toast({
        title: t.common.error,
        description: "Could not create checkout session",
        variant: "destructive",
      });
    } finally {
      setIsBillingLoading(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    setIsBillingLoading(true);
    try {
      const parsed = await fetchApiJsonResult<{ url: string }>(
        `/api/teams/${teamId}/billing/portal`,
        {
          method: "POST",
          fallbackError: "Could not open billing portal",
        }
      );

      if (!parsed.ok) {
        toast({
          title: t.common.error,
          description: parsed.error.error,
          variant: "destructive",
        });
        return;
      }

      window.location.href = parsed.data.url;
    } catch (error) {
      toast({
        title: t.common.error,
        description: "Could not open billing portal",
        variant: "destructive",
      });
    } finally {
      setIsBillingLoading(false);
    }
  };

  return (
    <TeamLayout
      team={initialTeam}
      activeMenuItem="settings"
    >
      <main className="p-4 sm:p-6 md:p-8">

          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              {t.settings.title}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">{t.settings.subtitle}</p>
          </div>

          <div className="mb-4 sm:mb-6 border-b border-gray-200">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto">
              {canManageUsers && (
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
              )}
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
              <button
                type="button"
                onClick={() => setActiveSettingsTab("billing")}
                className={`px-3 sm:px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeSettingsTab === "billing"
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-600 hover:text-gray-900"
                }`}
              >
                Assinatura
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t.settings.loading}</p>
            </div>
          ) : (
            <>
              {activeSettingsTab === "billing" ? (
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Assinatura do time
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Plano Pro: R$ 29,90 por time/mês.
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    Status atual:{" "}
                    <span className="font-semibold">
                      {hasStripeSubscription
                        ? (billingStatus ?? "desconhecido")
                        : "sem assinatura"}
                    </span>
                    {formattedPeriodEnd ? ` • próximo ciclo em ${formattedPeriodEnd}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {!hasActiveStripeSubscription ? (
                      <Button
                        type="button"
                        onClick={handleStartCheckout}
                        disabled={isBillingLoading}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isBillingLoading ? "Carregando..." : "Assinar plano Pro"}
                      </Button>
                    ) : null}
                    {hasStripeSubscription ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleOpenBillingPortal}
                        disabled={isBillingLoading}
                      >
                        {isBillingLoading ? "Carregando..." : "Gerenciar assinatura"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

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
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => openEditUserModal(managedUser)}
                                disabled={isMemberSaving || managedUser.userId === currentUserId}
                                className="border-gray-200 text-gray-700 hover:bg-gray-50"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <select
                                value={managedUser.role}
                                onChange={(e) =>
                                  handleUserRoleChange(
                                    managedUser.userId,
                                    e.target.value as ManagedUserRole
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
              ) : activeSettingsTab === "password" ? (
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
              ) : null}
            </>
          )}

          <AddUserToTeamsModal
            isOpen={isAddUserModalOpen}
            isSaving={isMemberSaving}
            teams={companyTeams}
            onClose={() => setIsAddUserModalOpen(false)}
            onSubmit={handleCreateUserAndAddMember}
          />

          {isEditUserModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                <div className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] px-6 py-4 rounded-t-xl">
                  <h2 className="text-lg font-bold text-white">{t.settings.editUserTitle}</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      {t.settings.modalEmail}
                    </label>
                    <Input
                      type="email"
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      placeholder={t.settings.modalEmailPlaceholder}
                      disabled={isMemberSaving}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      {t.settings.newPasswordOptional}
                    </label>
                    <div className="relative">
                      <Input
                        type={showEditUserPassword ? "text" : "password"}
                        value={editUserPassword}
                        onChange={(e) => setEditUserPassword(e.target.value)}
                        placeholder={t.settings.editUserPasswordPlaceholder}
                        className="pr-10"
                        disabled={isMemberSaving}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditUserPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={
                          showEditUserPassword
                            ? t.settings.hidePassword
                            : t.settings.showPassword
                        }
                      >
                        {showEditUserPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={closeEditUserModal}
                      disabled={isMemberSaving}
                    >
                      {t.settings.modalCancel}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleUpdateManagedUserInfo}
                      disabled={isMemberSaving}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isMemberSaving ? t.settings.modalSaving : t.settings.saveUserChanges}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </main>
    </TeamLayout>
  );
}
