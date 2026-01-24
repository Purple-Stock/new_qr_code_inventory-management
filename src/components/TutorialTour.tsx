"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

export interface TourStep {
  target: string;
  title: string;
  description: string;
}

interface TutorialTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps: TourStep[];
}

const PADDING = 8;

export function TutorialTour({
  isOpen,
  onClose,
  steps,
}: TutorialTourProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipBottom, setTooltipBottom] = useState(true);

  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const updateTarget = useCallback(() => {
    if (!current) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect(r);
    const spaceBelow = window.innerHeight - r.bottom;
    setTooltipBottom(spaceBelow >= 200 || spaceBelow >= r.top);
  }, [current?.target]);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !current) return;

    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const t = setTimeout(updateTarget, 350);
    const ro = new ResizeObserver(updateTarget);
    if (el) ro.observe(el);
    window.addEventListener("scroll", updateTarget, true);

    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [isOpen, step, current?.target, updateTarget]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (isLast) onClose();
    else setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <div
      className="fixed inset-0 z-[100]"
      aria-modal="true"
      role="dialog"
      aria-label={t.common.tutorial}
    >
      {/* Overlay with spotlight hole + purple ring */}
      {rect && (
        <div
          className="absolute rounded-xl border-2 border-[#6B21A8] bg-transparent"
          style={{
            left: Math.max(0, rect.left - PADDING),
            top: Math.max(0, rect.top - PADDING),
            width: Math.min(rect.width + PADDING * 2, window.innerWidth),
            height: Math.min(rect.height + PADDING * 2, window.innerHeight),
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      )}
      {!rect && current && (
        <div
          className="absolute inset-0 bg-black/55"
          style={{ boxShadow: "none" }}
        />
      )}

      {/* Tooltip */}
      {current && (
        <div
          className="absolute left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md z-[101] px-4"
          style={
            rect
              ? tooltipBottom
                ? { top: rect.bottom + PADDING + 12 }
                : { bottom: window.innerHeight - rect.top + PADDING + 12, top: "auto" }
              : { top: "50%", transform: "translate(-50%, -50%)" }
          }
        >
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] px-4 py-3 flex items-center justify-between">
              <span className="text-white text-sm font-medium">
                {t.tutorial?.step ?? "Step"} {step + 1} {t.tutorial?.of ?? "of"} {steps.length}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                aria-label={t.common.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <h3 className="text-base font-semibold text-gray-900 mb-1">
                {current.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {current.description}
              </p>
            </div>
            <div className="px-4 pb-4 flex justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                disabled={isFirst}
                className="text-gray-700 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                {t.tutorial?.prev ?? "Previous"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="bg-gradient-to-r from-[#6B21A8] to-[#7C3AED] hover:from-[#5B1A98] hover:to-[#6D28D9] text-white"
              >
                {isLast ? (t.tutorial?.finish ?? "Finish") : (t.tutorial?.next ?? "Next")}
                {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
