"use client";

import { useBooking } from "@/contexts/BookingContext";
import { ProgressBar } from "@/components/booking/ProgressBar";
import { Step0ForWho } from "@/components/booking/steps/Step0ForWho";
import { Step1RequestType } from "@/components/booking/steps/Step1RequestType";
import { Step2Receipt } from "@/components/booking/steps/Step2Receipt";
import { Step3Identity } from "@/components/booking/steps/Step3Identity";
import { Step4Situation } from "@/components/booking/steps/Step4Situation";
import { Step5Physical } from "@/components/booking/steps/Step5Physical";
import { Step6Parents } from "@/components/booking/steps/Step6Parents";
import { Step7CenterDate } from "@/components/booking/steps/Step7CenterDate";
import { Step8Confirmation } from "@/components/booking/steps/Step8Confirmation";

const STEPS = [
  Step0ForWho,
  Step1RequestType,
  Step2Receipt,
  Step3Identity,
  Step4Situation,
  Step5Physical,
  Step6Parents,
  Step7CenterDate,
  Step8Confirmation,
];

export function MultiStepForm() {
  const { state, totalSteps, progress } = useBooking();

  const CurrentStep = STEPS[state.currentStep];

  if (!CurrentStep) return null;

  return (
    <div className="w-full">
      {/* Barre de progression */}
      <div className="mb-8">
        <ProgressBar
          currentStep={state.currentStep}
          totalSteps={totalSteps}
          progress={progress}
        />
      </div>

      {/* Indicateur de brouillon restauré */}
      {state.currentStep > 0 && state.currentStep < 8 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Brouillon sauvegardé automatiquement
        </div>
      )}

      {/* Étape courante */}
      <CurrentStep />
    </div>
  );
}
