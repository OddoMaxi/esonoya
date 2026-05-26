"use client";

import { cn } from "@/lib/utils";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";
import type { BookingFor } from "@/types";

const OPTIONS: { value: BookingFor; label: string; desc: string; icon: string }[] = [
  {
    value: "self",
    label: "Pour moi-même",
    desc: "Je prends rendez-vous pour mon propre passeport.",
    icon: "🙋",
  },
  {
    value: "other",
    label: "Pour une autre personne",
    desc: "Je représente un proche : enfant, parent, conjoint…",
    icon: "👨‍👩‍👦",
  },
];

export function Step0ForWho() {
  const { state, update, goNext } = useBooking();

  const handleSelect = (value: BookingFor) => {
    update({ booking_for: value });
  };

  return (
    <StepWrapper
      title="Pour qui prenez-vous rendez-vous ?"
      subtitle="Choisissez si vous réservez pour vous-même ou pour quelqu'un d'autre."
      onNext={goNext}
    >
      <div className="grid gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all",
              "hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              state.booking_for === opt.value
                ? "border-blue-700 bg-blue-50 shadow-sm"
                : "border-gray-200 bg-white"
            )}
            aria-pressed={state.booking_for === opt.value}
          >
            <span className="text-3xl mt-0.5">{opt.icon}</span>
            <div>
              <p
                className={cn(
                  "font-semibold text-sm",
                  state.booking_for === opt.value
                    ? "text-blue-900"
                    : "text-gray-900"
                )}
              >
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
            </div>
            {state.booking_for === opt.value && (
              <span className="ml-auto text-blue-700 font-bold text-lg">✓</span>
            )}
          </button>
        ))}
      </div>

      {state.booking_for === "other" && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
          ℹ️ Vous devrez renseigner vos coordonnées de déclarant à l&apos;étape
          de confirmation.
        </div>
      )}
    </StepWrapper>
  );
}
