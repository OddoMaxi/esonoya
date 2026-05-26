"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";

const schema = z.object({
  receipt_reference: z
    .string()
    .min(1, "La référence du reçu est obligatoire")
    .min(5, "La référence doit contenir au moins 5 caractères")
    .max(100, "La référence est trop longue"),
});

type FormData = z.infer<typeof schema>;

export function Step2Receipt() {
  const { state, update, goNext, goPrev } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { receipt_reference: state.receipt_reference },
  });

  const onSubmit = (data: FormData) => {
    update({ receipt_reference: data.receipt_reference });
    goNext();
  };

  return (
    <StepWrapper
      title="Référence du reçu de paiement"
      subtitle="Saisissez le numéro de référence figurant sur votre reçu de paiement des frais de passeport."
      onNext={handleSubmit(onSubmit)}
      onPrev={goPrev}
    >
      {/* Encart explicatif */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-sm font-medium text-blue-900 mb-1">
          📄 Où trouver cette référence ?
        </p>
        <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
          <li>Sur le reçu remis par l&apos;agence bancaire agréée</li>
          <li>Format habituel : lettre(s) suivie(s) de chiffres</li>
          <li>Ex : REC-2024-00123 ou GNF-456789</li>
        </ul>
      </div>

      <Input
        id="receipt_reference"
        label="Référence du reçu"
        placeholder="Ex : REC-2024-00123"
        autoComplete="off"
        autoFocus
        required
        uppercase
        error={errors.receipt_reference?.message}
        {...register("receipt_reference")}
      />

      <p className="text-xs text-gray-500">
        Cette référence sera vérifiée lors de votre rendez-vous.
        Assurez-vous qu&apos;elle est correcte.
      </p>
    </StepWrapper>
  );
}
