"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";

const schema = z.object({
  height_cm: z
    .string()
    .optional()
    .refine((v) => !v || (Number(v) >= 50 && Number(v) <= 250), {
      message: "Taille entre 50 et 250 cm",
    }),
  eye_color:          z.string().max(30).optional(),
  distinctive_signs:  z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

const EYE_COLORS = [
  "Noir", "Marron", "Noisette", "Vert", "Bleu", "Gris", "Autre",
];

export function Step5Physical() {
  const { state, update, goNext, goPrev } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      height_cm:         state.height_cm,
      eye_color:         state.eye_color,
      distinctive_signs: state.distinctive_signs,
    },
  });

  const onSubmit = (data: FormData) => {
    update({
      height_cm:         data.height_cm ?? "",
      eye_color:         data.eye_color ?? "",
      distinctive_signs: data.distinctive_signs ?? "",
    });
    goNext();
  };

  return (
    <StepWrapper
      title="Signalement"
      subtitle="Informations physiques pour l'identification. Tous les champs sont optionnels."
      onNext={handleSubmit(onSubmit)}
      onPrev={goPrev}
      nextLabel="Continuer →"
    >
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-600">
        ℹ️ Ces informations apparaîtront dans votre passeport pour faciliter
        l&apos;identification.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="height_cm"
          type="number"
          label="Taille (cm)"
          placeholder="175"
          min={50}
          max={250}
          hint="Entre 50 et 250 cm"
          error={errors.height_cm?.message}
          {...register("height_cm")}
        />
        <Select
          id="eye_color"
          label="Couleur des yeux"
          placeholder="Sélectionner"
          error={errors.eye_color?.message}
          {...register("eye_color")}
        >
          {EYE_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label
          htmlFor="distinctive_signs"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Signes particuliers
        </label>
        <textarea
          id="distinctive_signs"
          rows={3}
          placeholder="CICATRICE, TACHE DE NAISSANCE, TATOUAGE…"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none uppercase"
          onInput={(e) => {
            const el = e.currentTarget;
            const pos = el.selectionStart;
            el.value = el.value.toUpperCase();
            el.setSelectionRange(pos, pos);
          }}
          {...register("distinctive_signs")}
        />
        {errors.distinctive_signs && (
          <p className="mt-1 text-xs text-red-600">
            {errors.distinctive_signs.message}
          </p>
        )}
      </div>
    </StepWrapper>
  );
}
