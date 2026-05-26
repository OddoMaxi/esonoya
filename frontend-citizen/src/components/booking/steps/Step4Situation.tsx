"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";

const schema = z.object({
  marital_status: z.enum(
    ["single", "married", "divorced", "widowed"],
    { message: "Sélectionnez une situation matrimoniale" }
  ),
  profession: z.string().max(100).optional(),
});

type FormData = z.infer<typeof schema>;

const MARITAL_OPTIONS = [
  { value: "single",   label: "Célibataire" },
  { value: "married",  label: "Marié(e)" },
  { value: "divorced", label: "Divorcé(e)" },
  { value: "widowed",  label: "Veuf / Veuve" },
];

export function Step4Situation() {
  const { state, update, goNext, goPrev } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      marital_status: state.marital_status as FormData["marital_status"] | undefined,
      profession:     state.profession,
    },
  });

  const onSubmit = (data: FormData) => {
    update({
      marital_status: data.marital_status,
      profession:     data.profession ?? "",
    });
    goNext();
  };

  return (
    <StepWrapper
      title="Situation personnelle"
      subtitle="Ces informations sont requises pour l'établissement du passeport."
      onNext={handleSubmit(onSubmit)}
      onPrev={goPrev}
    >
      <Select
        id="marital_status"
        label="Situation matrimoniale"
        required
        placeholder="Sélectionner"
        error={errors.marital_status?.message}
        {...register("marital_status")}
      >
        {MARITAL_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <Input
        id="profession"
        label="Profession (optionnel)"
        placeholder="EX : ENSEIGNANT, COMMERÇANT, ÉTUDIANT…"
        uppercase
        error={errors.profession?.message}
        {...register("profession")}
      />
    </StepWrapper>
  );
}
