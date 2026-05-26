"use client";

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/contexts/BookingContext";

interface StepWrapperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  onPrev?: () => void;
  isSubmitting?: boolean;
  nextLabel?: string;
  isLastStep?: boolean;
  canGoNext?: boolean;
}

export function StepWrapper({
  title,
  subtitle,
  children,
  onNext,
  onPrev,
  isSubmitting = false,
  nextLabel,
  isLastStep = false,
  canGoNext = true,
}: StepWrapperProps) {
  const { goPrev, state } = useBooking();

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Titre de l'étape */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Contenu */}
      <div className="space-y-4">{children}</div>

      {/* Navigation */}
      <div className="flex gap-3 mt-8">
        {state.currentStep > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={onPrev ?? goPrev}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none sm:w-28"
          >
            ← Retour
          </Button>
        )}
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          isLoading={isSubmitting}
          disabled={!canGoNext}
          className="flex-1"
        >
          {isLastStep
            ? "Confirmer le rendez-vous"
            : nextLabel ?? "Continuer →"}
        </Button>
      </div>
    </div>
  );
}
