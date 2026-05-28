"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { cn, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/contexts/BookingContext";
import { appointmentService } from "@/services/appointment.service";
import { getApiErrorMessage } from "@/lib/api";
import type { BookingFormData, ApplicantPayload } from "@/types";

// ─── Schéma déclarant (si booking pour autrui) ────────────────

const declarantSchema = z.object({
  last_name:    z.string().min(2, "Nom obligatoire"),
  first_name:   z.string().min(2, "Prénom obligatoire"),
  phone:        z.string().regex(/^(\+?224)?[6-7]\d{8}$/, "Téléphone invalide"),
  email:        z.string().email("Email invalide").or(z.literal("")).optional(),
  relationship: z.enum(["parent", "sibling", "spouse", "other"], {
    message: "Sélectionnez la relation",
  }),
});

type DeclarantForm = z.infer<typeof declarantSchema>;

const RELATIONSHIP_LABELS: Record<string, string> = {
  parent:  "Parent (père/mère)",
  sibling: "Frère / Sœur",
  spouse:  "Conjoint(e)",
  other:   "Autre",
};

// ─── Helpers fiche ────────────────────────────────────────────

function FRow({ label, value, half }: { label: string; value?: string; half?: boolean }) {
  return (
    <tr className={half ? "w-1/2" : ""}>
      <td className="border border-gray-400 px-2 py-1 text-xs text-gray-600 whitespace-nowrap bg-gray-50 w-40">{label}</td>
      <td className="border border-gray-400 px-2 py-1 text-xs font-medium text-gray-900 min-w-0">{value ?? ""}</td>
    </tr>
  );
}

function CheckBox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 mr-4 text-xs">
      <span className={`inline-block w-3 h-3 border border-gray-500 ${checked ? "bg-gray-800" : "bg-white"} flex-shrink-0`} />
      {label}
    </span>
  );
}

// ─── Section récap ────────────────────────────────────────────

function RecapRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────

export function Step8Confirmation() {
  const { state, setDeclarant, goPrev, reset } = useBooking();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError]   = useState("");
  const router = useRouter();

  const isForOther = state.booking_for === "other";

  const declarantForm = useForm<DeclarantForm>({
    resolver: zodResolver(declarantSchema),
    defaultValues: state.declarant ?? {
      last_name:    "",
      first_name:   "",
      phone:        "",
      email:        "",
      relationship: undefined,
    },
  });

  const handleSubmit = async () => {
    let declarantData = state.declarant;

    // Valider le formulaire déclarant si réservation pour autrui
    if (isForOther) {
      const valid = await declarantForm.trigger();
      if (!valid) return;
      declarantData = declarantForm.getValues();
      setDeclarant(declarantData);
    }

    setIsSubmitting(true);
    setServerError("");

    try {
      const payload: BookingFormData = {
        booking_for:       state.booking_for,
        request_type:      state.request_type as BookingFormData["request_type"],
        receipt_reference: state.receipt_reference,
        center_id:         state.center_id,
        quota_id:          state.quota_id,
        appointment_date:  state.appointment_date,
        applicant: {
          last_name:         state.last_name,
          first_name:        state.first_name,
          birth_date:        state.birth_date,
          birth_place:       state.birth_place,
          nationality:       state.nationality,
          gender:            state.gender as "M" | "F",
          marital_status:    state.marital_status as ApplicantPayload["marital_status"],
          profession:        state.profession || undefined,
          height_cm:         state.height_cm ? Number(state.height_cm) : undefined,
          eye_color:         state.eye_color || undefined,
          distinctive_signs: state.distinctive_signs || undefined,
          phone:             state.phone,
          email:             state.email || undefined,
          address:           state.address || undefined,
          father_last_name:  state.father_last_name || undefined,
          father_first_name: state.father_first_name || undefined,
          mother_last_name:  state.mother_last_name || undefined,
          mother_first_name: state.mother_first_name || undefined,
        } satisfies ApplicantPayload,
        declarant: declarantData ?? undefined,
      };

      const appointment = await appointmentService.createAppointment(payload);

      reset();
      router.push(`/rdv/${appointment.id}/succes`);
    } catch (err) {
      setServerError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const REQUEST_TYPE_LABELS: Record<string, string> = {
    new:     "Première demande",
    renewal: "Renouvellement",
    duplicata: "Duplicata",
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Confirmation</h2>
        <p className="text-sm text-gray-500 mt-1">
          Vérifiez vos informations avant de valider le rendez-vous.
        </p>
      </div>

      <div className="space-y-4">

        {/* ── Fiche DEMANDE DE PASSEPORT ── */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden text-xs">

          {/* En-tête */}
          <div className="flex">
            <div className="flex-1 bg-gray-700 text-white text-center font-bold tracking-widest py-2 text-sm uppercase">
              Demande de Passeport
            </div>
            <div className="w-20 border-l border-gray-400 flex items-center justify-center text-gray-400 font-semibold text-xs">
              PHOTO
            </div>
          </div>

          {/* Éléments de la demande */}
          <div className="border-t border-gray-400">
            <div className="px-2 py-1 font-bold text-xs border-b border-gray-300 bg-gray-50">
              Éléments de la demande
            </div>
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 text-xs text-gray-600 whitespace-nowrap w-40">Type de la demande*</td>
                  <td className="border border-gray-400 px-2 py-1">
                    <CheckBox checked={state.request_type === "new"}       label="Première demande" />
                    <CheckBox checked={state.request_type === "renewal"}   label="Renouvellement" />
                    <CheckBox checked={state.request_type === "duplicata"} label="Duplicata" />
                  </td>
                </tr>
                <FRow label="Numéro de Récépissé*" value={state.receipt_reference} />
              </tbody>
            </table>
          </div>

          {/* Informations personnelles */}
          <div className="border-t border-gray-400">
            <div className="px-2 py-1 font-bold text-xs border-b border-gray-300 bg-gray-50">
              Informations personnelles <span className="font-normal text-gray-500">(en lettres capitales)</span>
            </div>
            <table className="w-full border-collapse">
              <tbody>
                <FRow label="b) Prénoms*" value={state.first_name?.toUpperCase()} />
                <FRow label="c) Nom*" value={state.last_name?.toUpperCase()} />
                <FRow label="d) Date de naissance*" value={state.birth_date ? formatDate(state.birth_date) : ""} />
                <FRow label="e) Lieu de naissance*" value={state.birth_place} />
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 text-xs text-gray-600 w-40">f) Nationalité d'origine*</td>
                  <td className="border border-gray-400 px-2 py-1 text-xs">
                    <span className="flex justify-between items-center">
                      <span className="font-medium">{state.nationality}</span>
                      <span className="ml-4 whitespace-nowrap">
                        k) Sexe* :&nbsp;
                        <CheckBox checked={state.gender === "M"} label="Masculin" />
                        <CheckBox checked={state.gender === "F"} label="Féminin" />
                      </span>
                    </span>
                  </td>
                </tr>
                <FRow label="h) Profession*" value={state.profession} />
                <FRow label="i) Domicile*" value={state.address} />
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 text-xs text-gray-600 w-40">j) Situation Matrimoniale*</td>
                  <td className="border border-gray-400 px-2 py-1">
                    <CheckBox checked={state.marital_status === "single"}   label="Célibataire" />
                    <CheckBox checked={state.marital_status === "married"}  label="Marié(e)" />
                    <CheckBox checked={state.marital_status === "widowed"}  label="Veuf(veuve)" />
                    <CheckBox checked={state.marital_status === "divorced"} label="Divorcé(e)" />
                  </td>
                </tr>
                <FRow label="Téléphone" value={state.phone} />
                {state.email && <FRow label="Email" value={state.email} />}
              </tbody>
            </table>
          </div>

          {/* Signalement */}
          <div className="border-t border-gray-400">
            <div className="px-2 py-1 font-bold text-xs border-b border-gray-300 bg-gray-50">Signalement</div>
            <table className="w-full border-collapse">
              <tbody>
                <tr>
                  <td className="border border-gray-400 px-2 py-1 bg-gray-50 text-xs text-gray-600 w-40">a) Taille (cm)</td>
                  <td className="border border-gray-400 px-2 py-1 text-xs font-medium">{state.height_cm ?? ""}</td>
                </tr>
                <FRow label="b) Signes particuliers" value={state.distinctive_signs} />
                <FRow label="e) Couleur des yeux"   value={state.eye_color} />
              </tbody>
            </table>
          </div>

          {/* Informations ascendants */}
          <div className="border-t border-gray-400">
            <div className="px-2 py-1 font-bold text-xs border-b border-gray-300 bg-gray-50">Informations ascendants</div>
            <table className="w-full border-collapse">
              <tbody>
                <FRow label="PÈRE — Prénoms" value={state.father_first_name} />
                <FRow label="PÈRE — Nom"     value={state.father_last_name} />
                <FRow label="MÈRE — Prénoms" value={state.mother_first_name} />
                <FRow label="MÈRE — Nom"     value={state.mother_last_name} />
              </tbody>
            </table>
          </div>

          {/* Rendez-vous */}
          <div className="border-t border-gray-400">
            <div className="px-2 py-1 font-bold text-xs border-b border-gray-300 bg-blue-50 text-blue-800">
              📅 Rendez-vous
            </div>
            <table className="w-full border-collapse">
              <tbody>
                <FRow label="Centre"          value={state.center_name} />
                <FRow label="Date du RDV"     value={state.appointment_date ? formatDate(state.appointment_date) : ""} />
              </tbody>
            </table>
          </div>

          <p className="px-3 py-2 text-gray-400 italic">* Remplissez tous les champs</p>
        </div>

        {/* Formulaire déclarant (si pour autrui) */}
        {isForOther && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-4">
              👤 Vos coordonnées (déclarant)
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="decl_last_name"
                  label="Votre nom"
                  placeholder="CAMARA"
                  required
                  error={declarantForm.formState.errors.last_name?.message}
                  {...declarantForm.register("last_name")}
                />
                <Input
                  id="decl_first_name"
                  label="Votre prénom"
                  placeholder="Ibrahima"
                  required
                  error={declarantForm.formState.errors.first_name?.message}
                  {...declarantForm.register("first_name")}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="decl_phone"
                  type="tel"
                  label="Votre téléphone"
                  placeholder="621 234 567"
                  required
                  error={declarantForm.formState.errors.phone?.message}
                  {...declarantForm.register("phone")}
                />
                <Input
                  id="decl_email"
                  type="email"
                  label="Votre email (optionnel)"
                  placeholder="exemple@email.com"
                  error={declarantForm.formState.errors.email?.message}
                  {...declarantForm.register("email")}
                />
              </div>
              <Select
                id="decl_relationship"
                label="Votre relation avec le demandeur"
                required
                placeholder="Sélectionner"
                error={declarantForm.formState.errors.relationship?.message}
                {...declarantForm.register("relationship")}
              >
                {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {/* Erreur serveur */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            ❌ {serverError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={goPrev}
            disabled={isSubmitting}
            className="w-28"
          >
            ← Retour
          </Button>
          <Button
            type="button"
            size="lg"
            isLoading={isSubmitting}
            onClick={handleSubmit}
            className="flex-1"
          >
            ✓ Confirmer le rendez-vous
          </Button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          En confirmant, vous acceptez les conditions d&apos;utilisation du
          service eSonoya.
        </p>
      </div>
    </div>
  );
}
