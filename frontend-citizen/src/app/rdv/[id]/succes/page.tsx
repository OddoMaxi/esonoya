"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { appointmentService } from "@/services/appointment.service";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { QrCode } from "@/components/QrCode";
import type { Appointment } from "@/types";

const REQUEST_TYPE_LABEL: Record<string, string> = {
  new:     "Première demande",
  renewal: "Renouvellement",
  duplicata: "Duplicata",
};

export default function SuccessPage() {
  const { id }  = useParams<{ id: string }>();
  const router   = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading]         = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = useCallback(async () => {
    if (!appointment) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await appointmentService.downloadPdf(appointment.id, appointment.reference_number);
    } catch {
      setDownloadError("Erreur lors du téléchargement. Réessayez.");
    } finally {
      setDownloading(false);
    }
  }, [appointment]);

  const frontendUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FRONTEND_URL ?? "";

  useEffect(() => {
    if (!id) { router.push("/"); return; }
    appointmentService
      .getAppointment(id)
      .then(setAppointment)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!appointment) return null;

  const qrValue = `${frontendUrl}/rdv/v/${appointment.qr_token}`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 flex flex-col items-center">
      <div className="w-full max-w-md space-y-5">

        {/* Succès */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">✅</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous confirmé !</h1>
          <p className="text-sm text-gray-500 mt-1">
            Conservez ce billet et présentez-le le jour J.
          </p>
        </div>

        {/* Billet principal */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Entête bleue */}
          <div className="bg-blue-900 px-5 py-4 text-white text-center">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Référence</p>
            <p className="text-3xl font-bold font-mono tracking-widest">
              {appointment.reference_number}
            </p>
          </div>

          {/* Infos + QR */}
          <div className="p-5">
            <div className="flex items-start gap-5">
              {/* QR code */}
              <div className="flex-shrink-0 flex flex-col items-center gap-2">
                <QrCode value={qrValue} size={140} />
                <p className="text-[10px] text-gray-400 text-center leading-tight max-w-[140px]">
                  À présenter à l'agent
                </p>
              </div>

              {/* Détails */}
              <div className="flex-1 space-y-3 text-sm min-w-0">
                <div>
                  <p className="text-xs text-gray-400">Centre</p>
                  <p className="font-semibold text-gray-900 leading-tight">
                    {appointment.center.name}
                  </p>
                  <p className="text-xs text-gray-500">{appointment.center.city}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Date</p>
                  <p className="font-semibold text-gray-900">
                    {formatDate(appointment.appointment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Demandeur</p>
                  <p className="font-medium text-gray-900 truncate">
                    {appointment.applicant.first_name} {appointment.applicant.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Type</p>
                  <p className="font-medium text-gray-900">
                    {REQUEST_TYPE_LABEL[appointment.request_type]}
                  </p>
                </div>
              </div>
            </div>

            {/* Tirets séparateur façon billet */}
            <div className="flex items-center gap-2 my-4">
              <div className="flex-1 border-t border-dashed border-gray-200" />
              <div className="w-3 h-3 rounded-full bg-gray-100 border border-gray-200" />
              <div className="flex-1 border-t border-dashed border-gray-200" />
            </div>

            <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-800 text-center">
              📱 SMS de confirmation envoyé au{" "}
              <strong>{appointment.applicant.phone}</strong>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-900 mb-2">À apporter le jour du RDV :</p>
          <ul className="space-y-1 text-amber-800">
            <li>• Ce QR code (écran ou imprimé)</li>
            <li>• Acte de naissance original + copie certifiée</li>
            <li>• 2 photos d'identité (fond blanc, 4×4 cm)</li>
            <li>• Réçu de paiement original</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {downloadError && (
            <p className="text-center text-sm text-red-600">{downloadError}</p>
          )}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center w-full bg-blue-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? "Génération en cours…" : "📄 Télécharger le ticket PDF"}
          </button>
          <Link href={`/rdv/${appointment.id}/ticket`} className="block">
            <Button variant="secondary" size="lg" className="w-full">
              📱 Ouvrir la vue mobile
            </Button>
          </Link>
          <Link href="/tableau-de-bord" className="block">
            <Button variant="secondary" size="lg" className="w-full">
              Retour à mon espace
            </Button>
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Ce billet est valable uniquement pour le rendez-vous indiqué.
        </p>
      </div>
    </div>
  );
}
