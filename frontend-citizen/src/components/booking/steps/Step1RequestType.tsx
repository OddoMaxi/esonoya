"use client";

import { cn } from "@/lib/utils";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";
import type { RequestType } from "@/types";

const TYPES: {
  value: RequestType;
  label: string;
  desc: string;
  icon: string;
}[] = [
  {
    value: "new",
    label: "Première demande",
    desc: "Première demande — vous n'avez jamais eu de passeport guinéen.",
    icon: "🆕",
  },
  {
    value: "renewal",
    label: "Renouvellement",
    desc: "Votre passeport est expiré ou arrive bientôt à expiration.",
    icon: "🔄",
  },
  {
    value: "duplicata",
    label: "Duplicata",
    desc: "Remplacement d'un passeport perdu, volé ou endommagé.",
    icon: "📋",
  },
];

export function Step1RequestType() {
  const { state, update, goNext, goPrev } = useBooking();

  const handleSelect = (value: RequestType) => {
    update({ request_type: value });
  };

  return (
    <StepWrapper
      title="Type de demande"
      subtitle="Sélectionnez la nature de votre demande de passeport."
      onNext={goNext}
      onPrev={goPrev}
      canGoNext={state.request_type !== ""}
    >
      <div className="grid gap-3">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => handleSelect(t.value)}
            className={cn(
              "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
              "hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              state.request_type === t.value
                ? "border-blue-700 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white"
            )}
            aria-pressed={state.request_type === t.value}
          >
            <span className="text-3xl mt-0.5">{t.icon}</span>
            <div className="flex-1">
              <p
                className={cn(
                  "font-semibold text-sm",
                  state.request_type === t.value ? "text-blue-900" : "text-gray-900"
                )}
              >
                {t.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </div>
            {state.request_type === t.value && (
              <span className="text-blue-700 font-bold text-lg">✓</span>
            )}
          </button>
        ))}
      </div>

      {state.request_type === "duplicata" && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          ⚠️ Un duplicata nécessite une déclaration de perte ou de vol délivrée par la police.
          Présentez-la le jour du rendez-vous.
        </div>
      )}
    </StepWrapper>
  );
}
