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
  Info,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";
import { isValidEmail } from "@/lib/contracts/schemas";
import { AddUserToTeamsModal } from "@/components/AddUserToTeamsModal";
import { TeamLayout } from "@/components/shared/TeamLayout";
import { TutorialTour, type TourStep } from "@/components/TutorialTour";
import { ERROR_CODES } from "@/lib/errors";
import { fetchApiJsonResult, fetchApiResult } from "@/lib/api-client";
import type {
  AvailableUser,
  CompanyTeam,
  ManagedUser,
  ManagedUserRole,
  Team,
} from "../_types";

type TeamCustomFieldSchemaEntry = {
  key: string;
  label: string;
  active: boolean;
};

interface SettingsPageClientProps {
  teamId: number;
  initialTeam: Team;
}

function getBillingStatusLabel(status: string | null): string {
  if (!status) return "sem assinatura";
  if (status === "active") return "ativa";
  if (status === "trialing") return "em período de teste";
  if (status === "canceling") return "cancelando no fim do ciclo";
  if (status === "canceled") return "cancelada";
  if (status === "past_due") return "pagamento pendente";
  return status;
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
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isCustomSchemaSaving, setIsCustomSchemaSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);
  const { language, t } = useTranslation();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const billingRequired = searchParams.get("billing") === "required";
  const [billingStatus, setBillingStatus] = useState<string | null>(
    initialTeam.stripeSubscriptionStatus ?? null
  );
  const [itemCustomFieldSchema, setItemCustomFieldSchema] = useState<TeamCustomFieldSchemaEntry[]>(
    initialTeam.itemCustomFieldSchema ?? []
  );
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<string | null>(
    initialTeam.stripeCurrentPeriodEnd ?? null
  );
  const [manualTrialEndsAt, setManualTrialEndsAt] = useState<string | null>(
    initialTeam.manualTrialEndsAt ?? null
  );
  const hasStripeSubscription = Boolean(billingStatus);
  const hasActiveStripeSubscription = ["active", "trialing", "past_due", "canceling"].includes(
    billingStatus ?? ""
  );
  const hasActiveManualTrial = Boolean(
    manualTrialEndsAt && new Date(manualTrialEndsAt).getTime() > Date.now()
  );
  const formattedPeriodEnd = billingPeriodEnd
    ? new Date(billingPeriodEnd).toLocaleDateString()
    : null;
  const formattedManualTrialEnd = manualTrialEndsAt
    ? (() => {
        const parsed = new Date(manualTrialEndsAt);
        if (Number.isNaN(parsed.getTime())) {
          return null;
        }
        if (language === "pt-BR") {
          const day = String(parsed.getDate()).padStart(2, "0");
          const month = String(parsed.getMonth() + 1).padStart(2, "0");
          const year = parsed.getFullYear();
          return `${day}-${month}-${year}`;
        }
        return parsed.toLocaleDateString();
      })()
    : null;
  const tourSteps: TourStep[] = [
    { target: "tour-settings-tutorial", title: t.settings.tourTutorialTitle, description: t.settings.tourTutorialDesc },
    { target: "tour-settings-tabs", title: t.settings.tourTabsTitle, description: t.settings.tourTabsDesc },
    { target: "tour-settings-panel", title: t.settings.tourPanelTitle, description: t.settings.tourPanelDesc },
    { target: "tour-settings-custom-fields", title: t.settings.tourCustomFieldsTitle, description: t.settings.tourCustomFieldsDesc },
  ];

  useEffect(() => {
    fetchManagedUsers().finally(() => setIsLoading(false));
  }, [teamId]);

  useEffect(() => {
    const billingResult = searchParams.get("billing");
    if (billingResult !== "success" && billingResult !== "portal") {
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
          team: {
            stripeCurrentPeriodEnd?: string | null;
            manualTrialEndsAt?: string | null;
          };
        }>(`/api/teams/${teamId}`, {
          fallbackError: "Could not refresh team data",
        });
        if (teamResult.ok) {
          setBillingPeriodEnd(teamResult.data.team.stripeCurrentPeriodEnd ?? null);
          setManualTrialEndsAt(teamResult.data.team.manualTrialEndsAt ?? null);
        }
      } catch (error) {
        console.error("Error syncing billing status:", error);
      }
    };

    void syncBilling();
  }, [searchParams, teamId]);

  useEffect(() => {
    if (!billingRequired && !canManageUsers && activeSettingsTab === "users") {
      setActiveSettingsTab("password");
    }
  }, [canManageUsers, activeSettingsTab, billingRequired]);

  useEffect(() => {
    if (billingRequired) {
      setActiveSettingsTab("billing");
    }
  }, [billingRequired]);

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

  const addCustomFieldSchemaRow = () => {
    setItemCustomFieldSchema((prev) => [...prev, { key: "", label: "", active: true }]);
  };

  const updateCustomFieldSchemaRow = (
    index: number,
    patch: Partial<TeamCustomFieldSchemaEntry>
  ) => {
    setItemCustomFieldSchema((prev) =>
      prev.map((row, currentIndex) =>
        currentIndex === index ? { ...row, ...patch } : row
      )
    );
  };

  const removeCustomFieldSchemaRow = (index: number) => {
    setItemCustomFieldSchema((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSaveCustomFieldSchema = async () => {
    const normalized = itemCustomFieldSchema.map((entry) => ({
      key: entry.key.trim(),
      label: entry.label.trim(),
      active: entry.active,
    }));
    if (normalized.some((entry) => !entry.key || !entry.label)) {
      toast({
        title: t.common.error,
        description: t.settings.customFieldRequired,
        variant: "destructive",
      });
      return;
    }
    const uniqueKeys = new Set(normalized.map((entry) => entry.key));
    if (uniqueKeys.size !== normalized.length) {
      toast({
        title: t.common.error,
        description: t.settings.customFieldDuplicate,
        variant: "destructive",
      });
      return;
    }

    setIsCustomSchemaSaving(true);
    try {
      const result = await fetchApiJsonResult<{
        team: { itemCustomFieldSchema?: TeamCustomFieldSchemaEntry[] | null };
      }>(`/api/teams/${teamId}`, {
        method: "PUT",
        body: {
          itemCustomFieldSchema: normalized,
        },
        fallbackError: t.settings.errorSaving,
      });
      if (!result.ok) {
        toast({
          title: t.common.error,
          description: t.settings.errorSaving,
          variant: "destructive",
        });
        return;
      }

      setItemCustomFieldSchema(result.data.team.itemCustomFieldSchema ?? []);
      toast({
        title: t.common.success,
        description: t.settings.customFieldSchemaSaved,
      });
    } catch {
      toast({
        title: t.common.error,
        description: t.settings.errorSaving,
        variant: "destructive",
      });
    } finally {
      setIsCustomSchemaSaving(false);
    }
  };

  return (
    <TeamLayout
      team={initialTeam}
      activeMenuItem="settings"
    >
      <main className="p-4 sm:p-6 md:p-8">

          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t.settings.title}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">{t.settings.subtitle}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTutorialOpen(true)}
              data-tour="tour-settings-tutorial"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto touch-manipulation min-h-[40px] sm:min-h-0"
            >
              <Info className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t.common.tutorial}
            </Button>
          </div>

          <div data-tour="tour-settings-tabs" className="mb-4 sm:mb-6 border-b border-gray-200">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto">
              {canManageUsers && !billingRequired ? (
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
              ) : null}
              {!billingRequired ? (
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
              ) : null}
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
                <div data-tour="tour-settings-panel" className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    Assinatura do time
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Plano Pro: R$ 29,90 por time/mês.
                  </p>
                  {billingRequired ? (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-4">
                      Assinatura obrigatória para liberar o acesso ao sistema deste time.
                    </p>
                  ) : null}
                  <p className="text-sm text-gray-700 mb-4">
                    Status atual:{" "}
                    <span className="font-semibold">
                      {hasStripeSubscription
                        ? getBillingStatusLabel(billingStatus)
                        : hasActiveManualTrial
                          ? "trial manual ativo"
                          : "sem assinatura"}
                    </span>
                    {formattedPeriodEnd ? ` • próximo ciclo em ${formattedPeriodEnd}` : ""}
                    {!hasStripeSubscription && hasActiveManualTrial && formattedManualTrialEnd
                      ? ` • trial até ${formattedManualTrialEnd}`
                      : ""}
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
                <div data-tour="tour-settings-panel" className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {t.settings.usersPermissionsTitle}
                  </h2>
                  <p className="text-sm text-gray-600 mb-4 sm:mb-6">
                    {t.settings.usersPermissionsSubtitle}
                  </p>

                  <div
                    className="mb-6 rounded-lg border border-gray-200 p-4"
                    data-tour="tour-settings-custom-fields"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {t.settings.customFieldsTitle}
                        </h3>
                        <p className="text-xs text-gray-600">
                          {t.settings.customFieldsSubtitle}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCustomFieldSchemaRow}
                        className="border-gray-300"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t.settings.addCustomField}
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {itemCustomFieldSchema.length === 0 ? (
                        <p className="text-xs text-gray-500">{t.settings.noCustomFields}</p>
                      ) : (
                        itemCustomFieldSchema.map((field, index) => (
                          <div
                            key={`${field.key}-${index}`}
                            className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                          >
                            <Input
                              value={field.key}
                              onChange={(e) =>
                                updateCustomFieldSchemaRow(index, { key: e.target.value })
                              }
                              placeholder={t.settings.customFieldKeyPlaceholder}
                              className="sm:col-span-4 h-9"
                            />
                            <Input
                              value={field.label}
                              onChange={(e) =>
                                updateCustomFieldSchemaRow(index, { label: e.target.value })
                              }
                              placeholder={t.settings.customFieldLabelPlaceholder}
                              className="sm:col-span-5 h-9"
                            />
                            <label className="sm:col-span-2 flex items-center gap-2 text-xs text-gray-700">
                              <input
                                type="checkbox"
                                checked={field.active}
                                onChange={(e) =>
                                  updateCustomFieldSchemaRow(index, { active: e.target.checked })
                                }
                                className="w-4 h-4"
                              />
                              {t.settings.customFieldActive}
                            </label>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => removeCustomFieldSchemaRow(index)}
                              className="sm:col-span-1 border-red-200 text-red-600 hover:bg-red-50 h-9"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-3">
                      <Button
                        type="button"
                        onClick={handleSaveCustomFieldSchema}
                        disabled={isCustomSchemaSaving}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {isCustomSchemaSaving ? t.settings.modalSaving : t.settings.saveCustomFieldSchema}
                      </Button>
                    </div>
                  </div>

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
                <div data-tour="tour-settings-panel" className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    {t.settings.usersPermissionsTitle}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {t.settings.noPermissionManageMembers}
                  </p>
                </div>
              ) : activeSettingsTab === "password" ? (
                <div data-tour="tour-settings-panel" className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mt-4 sm:mt-6">
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

          <TutorialTour
            isOpen={isTutorialOpen}
            onClose={() => setIsTutorialOpen(false)}
            steps={tourSteps}
          />

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
