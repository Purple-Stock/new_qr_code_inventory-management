"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export interface TutorialStep {
  title: string;
  description: string;
}

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TutorialStep[];
  title?: string;
}

export function TutorialModal({
  isOpen,
  onClose,
  steps,
  title,
}: TutorialModalProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast) onClose();
    else setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] px-4 sm:px-6 py-4 flex items-center justify-between rounded-t-xl sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                {title || t.common.tutorial}
              </h2>
              <p className="text-white/80 text-xs sm:text-sm">
                {t.tutorial?.step ?? "Step"} {step + 1} {t.tutorial?.of ?? "of"} {steps.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-white/20 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 flex-shrink-0">
          <div
            className="h-full bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {current && (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {current.title}
              </h3>
              <p className="text-gray-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {current.description}
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex justify-between gap-3 flex-shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirst}
            className="text-gray-700 hover:bg-gray-100 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t.tutorial?.prev ?? "Previous"}
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white"
          >
            {isLast ? (t.tutorial?.finish ?? "Finish") : (t.tutorial?.next ?? "Next")}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
