"use client";

import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/lib/i18n";
import { useToast } from "@/components/ui/use-toast-simple";

interface Team {
  id: number;
  name: string;
  notes: string | null;
}

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onSuccess: () => void;
}

export function EditTeamModal({
  isOpen,
  onClose,
  team,
  onSuccess,
}: EditTeamModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name || "");
      setNotes(team.notes || "");
    }
  }, [team]);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setNotes("");
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!team) return;

    if (!name.trim()) {
      toast({
        title: t.settings.errorSaving,
        description: t.settings.teamNameRequired,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const userId = localStorage.getItem("userId");
      const response = await fetch(`/api/teams/${team.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId || "",
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
        variant: "success",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating team:", error);
      toast({
        title: t.settings.errorSaving,
        description: t.settings.errorSaving,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {t.common.edit} {t.common.selectTeam}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
            disabled={isSaving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div>
              <Label htmlFor="team-name" className="text-sm font-semibold text-gray-700 mb-2 block">
                {t.settings.teamName} *
              </Label>
              <Input
                id="team-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.settings.teamNamePlaceholder}
                className="w-full"
                required
                disabled={isSaving}
              />
            </div>

            <div>
              <Label htmlFor="team-notes" className="text-sm font-semibold text-gray-700 mb-2 block">
                {t.settings.notes}
              </Label>
              <Textarea
                id="team-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.settings.notesPlaceholder}
                className="w-full min-h-[120px]"
                rows={4}
                disabled={isSaving}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="text-gray-700 hover:bg-gray-100"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white"
            >
              {isSaving ? (
                <>
                  <span className="mr-2">{t.common.loading}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.common.save}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
