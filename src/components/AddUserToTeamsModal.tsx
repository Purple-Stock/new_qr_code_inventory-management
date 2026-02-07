"use client";

import { useEffect, useState } from "react";
import { X, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n";

type TeamRole = "admin" | "operator" | "viewer";

interface TeamOption {
  id: number;
  name: string;
}

interface AddUserToTeamsModalProps {
  isOpen: boolean;
  isSaving: boolean;
  teams: TeamOption[];
  onClose: () => void;
  onSubmit: (data: {
    email: string;
    password: string;
    role: TeamRole;
    teamIds: number[];
  }) => Promise<void>;
}

export function AddUserToTeamsModal({
  isOpen,
  isSaving,
  teams,
  onClose,
  onSubmit,
}: AddUserToTeamsModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<TeamRole>("viewer");
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSelectedTeamIds(teams.map((team) => team.id));
      setEmail("");
      setPassword("");
      setRole("viewer");
    }
  }, [isOpen, teams]);

  if (!isOpen) return null;

  const toggleTeam = (teamId: number) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({
      email: email.trim(),
      password: password.trim(),
      role,
      teamIds: selectedTeamIds,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-lg font-bold text-white">{t.settings.modalAddUserTitle}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user-email" className="text-sm font-semibold text-gray-700 mb-2 block">
                {t.settings.modalEmail}
              </Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.settings.modalEmailPlaceholder}
                required
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="user-password" className="text-sm font-semibold text-gray-700 mb-2 block">
                {t.settings.modalPassword}
              </Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.settings.modalPasswordPlaceholder}
                minLength={6}
                required
                disabled={isSaving}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t.settings.modalDefaultTeamRole}</Label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="h-10 rounded-md border border-gray-300 px-3 text-sm w-full md:w-56"
              disabled={isSaving}
            >
              <option value="admin">{t.settings.roleAdmin}</option>
              <option value="operator">{t.settings.roleOperator}</option>
              <option value="viewer">{t.settings.roleViewer}</option>
            </select>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700 mb-2 block">{t.settings.modalTeams}</Label>
            <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-3">
              {teams.map((team) => (
                <label key={team.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedTeamIds.includes(team.id)}
                    onChange={() => toggleTeam(team.id)}
                    disabled={isSaving}
                  />
                  <span>{team.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
              {t.settings.modalCancel}
            </Button>
            <Button
              type="submit"
              disabled={isSaving || selectedTeamIds.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {isSaving ? t.settings.modalSaving : t.settings.modalCreateAndAdd}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
