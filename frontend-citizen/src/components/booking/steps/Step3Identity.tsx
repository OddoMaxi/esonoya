"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StepWrapper } from "@/components/booking/StepWrapper";
import { useBooking } from "@/contexts/BookingContext";

const schema = z.object({
  last_name:   z.string().min(2, "Nom obligatoire (min. 2 caractères)").max(100),
  first_name:  z.string().min(2, "Prénom obligatoire (min. 2 caractères)").max(100),
  birth_date:  z.string().min(1, "Date de naissance obligatoire").refine((d) => {
    const date = new Date(d);
    const now = new Date();
    return date < now && date > new Date("1900-01-01");
  }, "Date de naissance invalide"),
  birth_place: z.string().min(2, "Lieu de naissance obligatoire").max(150),
  nationality: z.string().min(2, "Nationalité obligatoire").max(100),
  gender:      z.enum(["M", "F"], { message: "Sélectionnez le genre" }),
  phone: z
    .string()
    .min(1, "Téléphone obligatoire")
    .regex(/^(\+?224)?[6-7]\d{8}$/, "Format invalide. Ex : 621234567"),
  email:   z.string().email("Email invalide").or(z.literal("")).optional(),
  address: z.string().max(255).optional(),
});

type FormData = z.infer<typeof schema>;

export function Step3Identity() {
  const { state, update, goNext, goPrev } = useBooking();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      last_name:   state.last_name,
      first_name:  state.first_name,
      birth_date:  state.birth_date,
      birth_place: state.birth_place,
      nationality: state.nationality,
      gender:      state.gender as "M" | "F" | undefined,
      phone:       state.phone,
      email:       state.email,
      address:     state.address,
    },
  });

  const onSubmit = (data: FormData) => {
    update({
      last_name:   data.last_name,
      first_name:  data.first_name,
      birth_date:  data.birth_date,
      birth_place: data.birth_place,
      nationality: data.nationality,
      gender:      data.gender,
      phone:       data.phone,
      email:       data.email ?? "",
      address:     data.address ?? "",
    });
    goNext();
  };

  return (
    <StepWrapper
      title="Informations personnelles"
      subtitle="Saisissez les informations du titulaire du passeport."
      onNext={handleSubmit(onSubmit)}
      onPrev={goPrev}
    >
      {/* Nom et Prénom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="last_name"
          label="Nom de famille"
          placeholder="DIALLO"
          required
          uppercase
          autoComplete="family-name"
          error={errors.last_name?.message}
          {...register("last_name")}
        />
        <Input
          id="first_name"
          label="Prénom(s)"
          placeholder="MAMADOU"
          required
          uppercase
          autoComplete="given-name"
          error={errors.first_name?.message}
          {...register("first_name")}
        />
      </div>

      {/* Date et lieu de naissance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="birth_date"
          type="date"
          label="Date de naissance"
          required
          max={new Date().toISOString().split("T")[0]}
          error={errors.birth_date?.message}
          {...register("birth_date")}
        />
        <Input
          id="birth_place"
          label="Lieu de naissance"
          placeholder="CONAKRY"
          required
          uppercase
          error={errors.birth_place?.message}
          {...register("birth_place")}
        />
      </div>

      {/* Nationalité et Genre */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="nationality"
          label="Nationalité"
          placeholder="GUINÉENNE"
          required
          uppercase
          error={errors.nationality?.message}
          {...register("nationality")}
        />
        <Select
          id="gender"
          label="Genre"
          required
          placeholder="Sélectionner"
          error={errors.gender?.message}
          {...register("gender")}
        >
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </Select>
      </div>

      {/* Contact */}
      <div className="pt-2 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Coordonnées
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="phone"
            type="tel"
            label="Téléphone"
            placeholder="621 234 567"
            required
            autoComplete="tel"
            hint="Format : 6XXXXXXXX ou +224XXXXXXXXX"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Input
            id="email"
            type="email"
            label="Email (optionnel)"
            placeholder="exemple@email.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        </div>
        <div className="mt-4">
          <Input
            id="address"
            label="Adresse (optionnel)"
            placeholder="QUARTIER, COMMUNE, VILLE"
            uppercase
            error={errors.address?.message}
            {...register("address")}
          />
        </div>
      </div>
    </StepWrapper>
  );
}
