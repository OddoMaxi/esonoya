"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";

const schema = z.object({
  father_last_name:  z.string().max(100).optional(),
  father_first_name: z.string().max(100).optional(),
  mother_last_name:  z.string().max(100).optional(),
  mother_first_name: z.string().max(100).optional(),
});

type FormData = z.infer<typeof schema>;

export function Step6Parents() {
  const { state, update, goNext, goPrev } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      father_last_name:  state.father_last_name,
      father_first_name: state.father_first_name,
      mother_last_name:  state.mother_last_name,
      mother_first_name: state.mother_first_name,
    },
  });

  const onSubmit = (data: FormData) => {
    update({
      father_last_name:  data.father_last_name ?? "",
      father_first_name: data.father_first_name ?? "",
      mother_last_name:  data.mother_last_name ?? "",
      mother_first_name: data.mother_first_name ?? "",
    });
    goNext();
  };

  return (
    <StepWrapper
      title="Informations des parents"
      subtitle="Ces informations sont facultatives mais recommandées."
      onNext={handleSubmit(onSubmit)}
      onPrev={goPrev}
      nextLabel="Continuer →"
    >
      {/* Père */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          👨 Père
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="father_last_name"
            label="Nom du père"
            placeholder="DIALLO"
            uppercase
            error={errors.father_last_name?.message}
            {...register("father_last_name")}
          />
          <Input
            id="father_first_name"
            label="Prénom du père"
            placeholder="ALPHA"
            uppercase
            error={errors.father_first_name?.message}
            {...register("father_first_name")}
          />
        </div>
      </div>

      {/* Mère */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          👩 Mère
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="mother_last_name"
            label="Nom de la mère"
            placeholder="BALDE"
            uppercase
            error={errors.mother_last_name?.message}
            {...register("mother_last_name")}
          />
          <Input
            id="mother_first_name"
            label="Prénom de la mère"
            placeholder="FATOUMATA"
            uppercase
            error={errors.mother_first_name?.message}
            {...register("mother_first_name")}
          />
        </div>
      </div>
    </StepWrapper>
  );
}
