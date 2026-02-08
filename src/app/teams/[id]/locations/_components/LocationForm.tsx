"use client";

import Link from "next/link";
import { FileText, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationFormProps {
  t: any;
  name: string;
  description: string;
  isLoading: boolean;
  mode: "create" | "edit";
  cancelHref: string;
  onSubmit: (e: React.FormEvent) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function LocationForm({
  t,
  name,
  description,
  isLoading,
  mode,
  cancelHref,
  onSubmit,
  onNameChange,
  onDescriptionChange,
}: LocationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="space-y-2 mb-6" data-tour="tour-location-name">
          <Label htmlFor="name" className="text-gray-900">
            Name <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              id="name"
              type="text"
              placeholder={t.locationForm.namePlaceholder}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full pl-10"
              required
              maxLength={255}
            />
          </div>
        </div>

        <div className="space-y-2" data-tour="tour-location-description">
          <Label htmlFor="description" className="text-gray-900">
            Description
          </Label>
          <div className="relative">
            <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <textarea
              id="description"
              placeholder={t.locationForm.descriptionPlaceholder}
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={4}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 pt-4" data-tour="tour-location-submit">
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-[#6B21A8] hover:bg-[#6B21A8]/90 text-white font-semibold px-8 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mode === "create"
            ? isLoading
              ? t.locationForm.creating
              : t.locationForm.createAction
            : isLoading
            ? t.locationForm.updating
            : t.locationForm.updateAction}
        </Button>
        <Link href={cancelHref}>
          <Button
            type="button"
            variant="outline"
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t.common.cancel}
          </Button>
        </Link>
      </div>
    </form>
  );
}
