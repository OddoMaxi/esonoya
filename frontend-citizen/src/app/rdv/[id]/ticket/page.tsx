"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { appointmentService } from "@/services/appointment.service";
import { formatDate } from "@/lib/utils";
import { QrCode } from "@/components/QrCode";
import type { Appointment, AppointmentStatus } from "@/types";

const REQUEST_TYPE_LABEL: Record<string, string> = {
  new:     "Première demande",
  renewal: "Renouvellement",
  duplicata: "Duplicata",
};

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  pending:   { label: "En attente",  bg: "bg-yellow-100", text: "text-yellow-800" },
  confirmed: { label: "Confirmé",   bg: "bg-blue-100",   text: "text-blue-800" },
  present:   { label: "Présent",    bg: "bg-green-100",  text: "text-green-800" },
  absent:    { label: "Absent",     bg: "bg-red-100",    text: "text-red-800" },
  cancelled: { label: "Annulé",     bg: "bg-gray-100",   text: "text-gray-600" },
};

export default function TicketPage() {
  const { id }   = useParams<{ id: string }>();
  const router    = useRouter();
  const [appt, setAppt]         = useState<Appointment | null>(null);
  const [loading, setLoading]   = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  const frontendUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_FRONTEND_URL ?? "";

  useEffect(() => {
    if (!id) { router.push("/"); return; }
    appointmentService
      .getAppointment(id)
      .then(setAppt)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!appt) return null;

  const qrValue   = `${frontendUrl}/rdv/v/${appt.qr_token}`;
  const statusCfg = STATUS_CONFIG[appt.status];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Billet mobile centré, conçu pour être screenshot */}
      <div className="w-full max-w-xs bg-white rounded-3xl shadow-2xl overflow-hidden select-none">
        {/* Header */}
        <div className="bg-blue-900 p-5 text-center text-white">
          <div className="text-xs font-bold tracking-widest uppercase opacity-60 mb-1">
            eSonoya · Passeport Guinéen
          </div>
          <div className="text-xs opacity-50 mb-3">{appt.center.city}</div>
          <div className="text-4xl font-bold font-mono tracking-widest">
            {appt.reference_number}
          </div>
          <div className={`inline-flex items-center mt-3 px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
            {statusCfg.label}
          </div>
        </div>

        {/* QR code centré */}
        <div className="flex justify-center py-6 bg-white">
          <div className="p-3 border-4 border-blue-900 rounded-2xl">
            <QrCode value={qrValue} size={180} />
          </div>
        </div>

        {/* Ligne pointillée */}
        <div className="flex items-center mx-5">
          <div className="-ml-7 w-6 h-6 rounded-full bg-gray-50" />
          <div className="flex-1 border-t-2 border-dashed border-gray-200" />
          <div className="-mr-7 w-6 h-6 rounded-full bg-gray-50" />
        </div>

        {/* Infos */}
        <div className="px-5 py-5 space-y-3">
          <Row label="Centre"   value={appt.center.name} />
          <Row label="Date"     value={formatDate(appt.appointment_date)} />
          {appt.time_slot && <Row label="Créneau" value={appt.time_slot} />}
          <Row label="Demandeur" value={`${appt.applicant.first_name} ${appt.applicant.last_name}`} />
          <Row label="Type"     value={REQUEST_TYPE_LABEL[appt.request_type]} />
          {appt.qr_scanned_at && (
            <div className="mt-3 bg-green-50 rounded-xl px-3 py-2 text-xs text-green-800 text-center font-medium">
              ✅ Présence validée
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-5 py-4 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Présentez ce QR code à l'agent d'accueil.<br/>
            Valable uniquement pour la date indiquée.
          </p>
        </div>
      </div>

      {/* Bouton télécharger (hors billet) */}
      <button
        onClick={handleDownload}
        disabled={downloading || !appt}
        className="fixed bottom-6 right-6 bg-blue-900 text-white text-sm font-medium rounded-full px-4 py-3 shadow-lg hover:bg-blue-800 active:scale-95 transition-transform disabled:opacity-60"
      >
        {downloading ? "…" : "📄 PDF"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[65%] leading-tight">
        {value}
      </span>
    </div>
  );
}
