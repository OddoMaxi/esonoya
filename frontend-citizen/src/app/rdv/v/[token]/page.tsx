"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface PublicVerifyResult {
  valid: boolean;
  message?: string;
  reference?: string;
  date?: string;
  status?: string;
  center_name?: string;
  center_city?: string;
  applicant?: string;
  scanned_at?: string | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: string }> = {
  pending:   { label: "En attente de confirmation", color: "text-yellow-700 bg-yellow-50 border-yellow-200", icon: "⏳" },
  confirmed: { label: "Confirmé",                  color: "text-blue-700 bg-blue-50 border-blue-200",     icon: "📋" },
  present:   { label: "Présence enregistrée",      color: "text-green-700 bg-green-50 border-green-200", icon: "✅" },
  absent:    { label: "Absent",                    color: "text-red-700 bg-red-50 border-red-200",       icon: "❌" },
  cancelled: { label: "Annulé",                    color: "text-gray-700 bg-gray-50 border-gray-200",    icon: "🚫" },
};

export default function QrVerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [result, setResult]   = useState<PublicVerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }

    api.get("/qr/verify", { params: { token } })
      .then(({ data }) => setResult(data))
      .catch(() => setResult({ valid: false, message: "Erreur de vérification." }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  if (!result?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">QR Code invalide</h1>
          <p className="text-sm text-gray-500">{result?.message ?? "Ce QR code ne correspond à aucun rendez-vous."}</p>
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            Si vous pensez qu'il s'agit d'une erreur, présentez-vous à l'accueil avec votre réçu de paiement.
          </div>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_MAP[result.status ?? "pending"] ?? STATUS_MAP.pending;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        {/* En-tête */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-blue-900 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <span>🛂</span> eSonoya · Vérification RDV
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {result.reference}
          </h1>
        </div>

        {/* Statut */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${statusCfg.color}`}>
          <span className="text-2xl">{statusCfg.icon}</span>
          <div>
            <p className="font-semibold text-sm">{statusCfg.label}</p>
            {result.scanned_at && (
              <p className="text-xs opacity-75 mt-0.5">
                Scanné le {new Date(result.scanned_at).toLocaleDateString("fr-GN", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Infos rendez-vous */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Demandeur</span>
            <span className="font-medium text-gray-900">{result.applicant}</span>
          </div>
          <hr />
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Centre</span>
            <div className="text-right">
              <p className="font-medium text-gray-900">{result.center_name}</p>
              <p className="text-xs text-gray-400">{result.center_city}</p>
            </div>
          </div>
          <hr />
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Date RDV</span>
            <span className="font-medium text-gray-900">
              {result.date ? formatDate(result.date) : "—"}
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Page de vérification publique · eSonoya
        </p>
      </div>
    </div>
  );
}
