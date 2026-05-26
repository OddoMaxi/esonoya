"use client";

import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "Pour qui",
  "Type",
  "Reçu",
  "Identité",
  "Situation",
  "Signalement",
  "Parents",
  "Centre",
  "Confirmation",
];

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

export function ProgressBar({ currentStep, totalSteps, progress }: ProgressBarProps) {
  return (
    <div className="w-full">
      {/* Barre de progression */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          Étape {currentStep + 1} sur {totalSteps}
        </span>
        <span className="text-xs font-semibold text-blue-900">
          {STEP_LABELS[currentStep] ?? ""}
        </span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-900 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Points d'étapes (mobile : masqués, desktop : visibles) */}
      <div className="hidden sm:flex justify-between mt-2">
        {STEP_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              "flex flex-col items-center gap-0.5",
              i < currentStep
                ? "text-blue-700"
                : i === currentStep
                  ? "text-blue-900"
                  : "text-gray-400"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i < currentStep
                  ? "bg-blue-700"
                  : i === currentStep
                    ? "bg-blue-900"
                    : "bg-gray-300"
              )}
            />
            <span className="text-[10px] font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
