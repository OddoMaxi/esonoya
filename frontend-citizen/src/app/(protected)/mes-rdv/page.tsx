"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { appointmentService } from "@/services/appointment.service";
import type { Appointment, AppointmentStatus } from "@/types";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

// ─── Constantes d'affichage ────────────────────────────────────

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending:   "En attente",
  confirmed: "Confirmé",
  present:   "Présent",
  absent:    "Absent",
  cancelled: "Annulé",
};

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  present:   "bg-green-50 text-green-700 border-green-200",
  absent:    "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

const TYPE_LABEL: Record<string, string> = {
  new:     "Première demande",
  renewal: "Renouvellement",
  duplicata: "Duplicata",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-GN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-GN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Composant carte RDV ──────────────────────────────────────

function AppointmentCard({
  appt,
  onCancel,
}: {
  appt: Appointment;
  onCancel: (id: string) => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const isPast     = new Date(appt.appointment_date) < new Date(new Date().toDateString());
  const canCancel  = appt.status === "pending" || appt.status === "confirmed";
  const isCancelled = appt.status === "cancelled";

  const handleCancel = async () => {
    if (!confirm("Annuler ce rendez-vous ?")) return;
    setCancelling(true);
    try {
      await appointmentService.cancelAppointment(appt.id, "");
      onCancel(appt.id);
    } catch {
      alert("Impossible d'annuler. Réessayez.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${isCancelled ? "opacity-60" : "shadow-sm hover:shadow-md"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-base tracking-wide">
              {appt.reference_number}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[appt.status]}`}>
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{TYPE_LABEL[appt.request_type] ?? appt.request_type}</p>
        </div>

        {/* Date bloc */}
        <div className="flex-shrink-0 text-right">
          <p className="text-xs text-gray-400">Rendez-vous</p>
          <p className={`text-sm font-semibold ${isPast && !isCancelled ? "text-gray-400" : "text-blue-900"}`}>
            {formatDateShort(appt.appointment_date)}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 mx-5" />

      {/* Body */}
      <div className="px-5 py-3 space-y-1.5 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <span className="text-gray-400 mt-0.5 text-base leading-none">📍</span>
          <span className="font-medium text-gray-800">{appt.center.name}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-400 mt-0.5 text-base leading-none">👤</span>
          <span>{appt.applicant.first_name} {appt.applicant.last_name}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-400 mt-0.5 text-base leading-none">📅</span>
          <span className="capitalize">{formatDate(appt.appointment_date)}</span>
        </div>
      </div>

      {/* Actions */}
      {!isCancelled && (
        <div className="flex gap-2 px-5 pb-4 pt-1">
          <Link
            href={`/rdv/${appt.id}`}
            className="flex-1 text-center text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl py-2 hover:bg-blue-100 transition-colors"
          >
            Voir le détail
          </Link>

          {canCancel && !isPast && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl py-2 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {cancelling ? "Annulation…" : "Annuler"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────

export default function MesRdvPage() {
  const { user, logout } = useAuth();
  const router           = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<AppointmentStatus | "all">("all");

  useEffect(() => {
    appointmentService
      .getMyAppointments()
      .then(setAppointments)
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = (id: string) => {
    setAppointments((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: "cancelled" as AppointmentStatus } : a)
    );
  };

  const filtered = filter === "all"
    ? appointments
    : appointments.filter((a) => a.status === filter);

  const counts: Record<string, number> = { all: appointments.length };
  appointments.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  const handleLogout = async () => { await logout(); router.push("/"); };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader
        backHref="/tableau-de-bord"
        actions={
          <>
            <span className="text-xs text-gray-500 hidden sm:block">{user?.phone}</span>
            <button onClick={handleLogout} className="text-xs text-red-600 hover:text-red-800 font-medium">
              Déconnexion
            </button>
          </>
        }
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Title + CTA */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mes rendez-vous</h1>
            <p className="text-sm text-gray-500 mt-0.5">{appointments.length} dossier{appointments.length > 1 ? "s" : ""} au total</p>
          </div>
          <Link
            href="/prendre-rdv"
            className="bg-blue-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-800 transition-colors whitespace-nowrap"
          >
            + Nouveau RDV
          </Link>
        </div>

        {/* Filtres */}
        {appointments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(["all", "pending", "confirmed", "present", "absent", "cancelled"] as const).map((s) => {
              const count = counts[s] ?? 0;
              if (s !== "all" && count === 0) return null;
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    filter === s
                      ? "bg-blue-900 text-white border-blue-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {s === "all" ? "Tous" : STATUS_LABEL[s]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white rounded-2xl border animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">📋</div>
            {filter === "all" ? (
              <>
                <p className="font-medium text-gray-600">Aucun rendez-vous pour le moment</p>
                <p className="text-sm mt-1">Prenez votre premier rendez-vous dès maintenant.</p>
                <Link
                  href="/prendre-rdv"
                  className="mt-4 inline-block bg-blue-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-blue-800 transition-colors"
                >
                  Prendre un rendez-vous
                </Link>
              </>
            ) : (
              <p className="text-sm">Aucun rendez-vous dans cette catégorie.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
