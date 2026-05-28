"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { appointmentService } from "@/services/appointment.service";
import { formatDate } from "@/lib/utils";
import { QrCode } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import type { Appointment, AppointmentStatus } from "@/types";

const REQUEST_TYPE_LABEL: Record<string, string> = {
  new:     "Première demande",
  renewal: "Renouvellement",
  duplicata: "Duplicata",
};

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; cls: string }> = {
  pending:   { label: "En attente",  cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  confirmed: { label: "Confirmé",   cls: "bg-blue-50 text-blue-700 border-blue-200" },
  present:   { label: "Présent",    cls: "bg-green-50 text-green-700 border-green-200" },
  absent:    { label: "Absent",     cls: "bg-red-50 text-red-700 border-red-200" },
  cancelled: { label: "Annulé",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default function AppointmentDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [appt, setAppt]           = useState<Appointment | null>(null);
  const [loading, setLoading]     = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const frontendUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FRONTEND_URL ?? "";

  useEffect(() => {
    if (!id) { router.push("/"); return; }
    appointmentService
      .getAppointment(id)
      .then(setAppt)
      .catch(() => router.push("/mes-rdv"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleDownload = useCallback(async () => {
    if (!appt) return;
    setDownloading(true);
    try {
      await appointmentService.downloadPdf(appt.id, appt.reference_number);
    } catch {
      alert("Erreur lors du téléchargement. Réessayez.");
    } finally {
      setDownloading(false);
    }
  }, [appt]);

  const handleCancel = async () => {
    if (!appt) return;
    if (!confirm("Voulez-vous vraiment annuler ce rendez-vous ?")) return;
    setCancelling(true);
    try {
      await appointmentService.cancelAppointment(appt.id, "");
      setAppt({ ...appt, status: "cancelled" });
    } catch {
      alert("Impossible d'annuler. Veuillez réessayer.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!appt) return null;

  const qrValue  = `${frontendUrl}/rdv/v/${appt.qr_token}`;
  const statusCfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
  const canCancel = (appt.status === "pending" || appt.status === "confirmed")
    && new Date(appt.appointment_date) >= new Date(new Date().toDateString());

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        backHref="/mes-rdv"
        actions={
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        }
      />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Référence + QR */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-blue-900 px-5 py-5 text-white text-center">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Référence</p>
            <p className="text-3xl font-bold font-mono tracking-widest">{appt.reference_number}</p>
          </div>

          <div className="p-5 flex flex-col sm:flex-row items-center gap-6">
            {/* QR code */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              <div className="p-3 border-4 border-blue-900 rounded-2xl">
                <QrCode value={qrValue} size={160} />
              </div>
              <p className="text-[10px] text-gray-400 text-center max-w-[160px] leading-tight">
                À présenter à l'agent d'accueil
              </p>
            </div>

            {/* Infos */}
            <div className="flex-1 w-full space-y-3">
              <InfoRow label="Centre"          value={appt.center.name} />
              <InfoRow label="Ville"           value={appt.center.city} />
              {appt.center.address && (
                <InfoRow label="Adresse" value={appt.center.address} />
              )}
              <InfoRow label="Date"            value={formatDate(appt.appointment_date)} />
              <InfoRow label="Type"            value={REQUEST_TYPE_LABEL[appt.request_type] ?? appt.request_type} />
              <InfoRow label="Réf. paiement"   value={appt.receipt_reference} mono />
            </div>
          </div>

          {appt.qr_scanned_at && (
            <div className="mx-5 mb-5 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-800 font-medium text-center">
              ✅ Présence enregistrée
            </div>
          )}
        </div>

        {/* Demandeur */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
            Informations du demandeur
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <InfoBlock label="Nom"            value={`${appt.applicant.last_name} ${appt.applicant.first_name}`} />
            <InfoBlock label="Téléphone"      value={appt.applicant.phone} />
            <InfoBlock label="Date naissance" value={
              appt.applicant.birth_date
                ? new Date(appt.applicant.birth_date + "T00:00:00").toLocaleDateString("fr-GN", { day: "numeric", month: "long", year: "numeric" })
                : "—"
            } />
            <InfoBlock label="Lieu naissance" value={appt.applicant.birth_place ?? "—"} />
            <InfoBlock label="Nationalité"    value={appt.applicant.nationality ?? "—"} />
            <InfoBlock label="Genre"          value={appt.applicant.gender === "M" ? "Masculin" : "Féminin"} />
          </div>
        </div>

        {/* Documents à apporter */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-900 mb-2">Documents à apporter le jour J :</p>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Ce QR code (écran ou imprimé)</li>
            <li>• Réçu de paiement original ({appt.receipt_reference})</li>
            <li>• Pièce d'identité nationale en cours de validité</li>
            <li>• Acte de naissance (original + copie certifiée)</li>
            <li>• 2 photos d'identité (fond blanc, 4×4 cm)</li>
            {appt.request_type === "renewal" && <li>• Ancien passeport (original)</li>}
            {appt.request_type === "duplicata" && <li>• Déclaration de perte / vol (police)</li>}
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-6">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center w-full bg-blue-900 text-white text-sm font-semibold rounded-xl py-3 hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? "Génération en cours…" : "📄 Télécharger le ticket PDF"}
          </button>

          <Link href={`/rdv/${appt.id}/ticket`} className="block">
            <Button variant="secondary" size="lg" className="w-full">
              📱 Vue mobile (billet)
            </Button>
          </Link>

          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl py-3 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {cancelling ? "Annulation en cours…" : "Annuler ce rendez-vous"}
            </button>
          )}

          <Link href="/mes-rdv" className="block">
            <Button variant="secondary" size="lg" className="w-full">
              ← Mes rendez-vous
            </Button>
          </Link>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-gray-900 text-right leading-tight ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
