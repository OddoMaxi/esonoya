"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, Pagination } from "@/components/ui/DataTable";
import { Badge, STATUS_LABEL, STATUS_VARIANT } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { appointmentsService } from "@/services/appointments.service";
import { centersService } from "@/services/centers.service";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { Appointment, AppointmentFilters, AppointmentStatus, Center } from "@/types";

const STATUSES: AppointmentStatus[] = ["pending", "confirmed", "present", "absent", "cancelled"];
const STATUS_NEXT: Record<string, AppointmentStatus[]> = {
  pending:   ["confirmed", "cancelled"],
  confirmed: ["present", "absent", "cancelled"],
  present:   [],
  absent:    [],
  cancelled: [],
};

export default function RendezVousPage() {
  const { hasPermission } = useAdminAuth();
  const canUpdate = hasPermission("appointments.update");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<Center[]>([]);

  const [filters, setFilters] = useState<AppointmentFilters>({
    page: 1,
    per_page: 20,
  });
  const [search, setSearch] = useState("");
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const [selected, setSelected] = useState<Appointment | null>(null);
  const [statusModal, setStatusModal] = useState<Appointment | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    centersService.list().then(setCenters);
  }, []);

  const load = useCallback(async (f: AppointmentFilters) => {
    setLoading(true);
    try {
      const res = await appointmentsService.list(f);
      setAppointments(res.data);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value || undefined, page: 1 }));
    }, 350);
  };

  const handleFilter = (key: keyof AppointmentFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value || undefined, page: 1 }));
  };

  const handleStatusUpdate = async () => {
    if (!statusModal) return;
    setSaving(true);
    setError("");
    try {
      await appointmentsService.updateStatus(
        statusModal.id,
        newStatus,
        newStatus === "cancelled" ? cancelReason : undefined
      );
      setStatusModal(null);
      load(filters);
    } catch {
      setError("Erreur lors de la mise à jour.");
    } finally {
      setSaving(false);
    }
  };

  const exportCsv = () => {
    const url = appointmentsService.exportUrl(filters);
    window.open(url, "_blank");
  };

  const columns: ColumnDef<Appointment, unknown>[] = useMemo(() => [
    {
      header: "Référence",
      accessorKey: "reference_number",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium text-blue-700">{row.original.reference_number}</span>
      ),
    },
    {
      header: "Demandeur",
      id: "applicant",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 text-sm">
            {row.original.applicant?.last_name} {row.original.applicant?.first_name}
          </p>
          <p className="text-xs text-gray-400">{row.original.applicant?.phone}</p>
        </div>
      ),
    },
    {
      header: "Centre",
      id: "center",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-gray-900">{row.original.center?.name}</p>
          <p className="text-xs text-gray-400">{row.original.center?.city}</p>
        </div>
      ),
    },
    {
      header: "Date RDV",
      accessorKey: "appointment_date",
      cell: ({ getValue }) => (
        <span className="text-sm">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      header: "Type",
      accessorKey: "request_type",
      cell: ({ getValue }) => {
        const v = getValue() as string;
        return (
          <Badge variant={v === "new" ? "blue" : v === "renewal" ? "green" : "orange"}>
            {v === "new" ? "Nouveau" : v === "renewal" ? "Renouvellement" : "Perdu"}
          </Badge>
        );
      },
    },
    {
      header: "Statut",
      accessorKey: "status",
      cell: ({ getValue }) => {
        const s = getValue() as string;
        return <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>;
      },
    },
    {
      header: "Créé le",
      accessorKey: "created_at",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-400">{formatDate(getValue() as string)}</span>
      ),
    },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => setSelected(row.original)}
            className="text-xs text-blue-600 hover:underline"
          >
            Voir
          </button>
          {canUpdate && STATUS_NEXT[row.original.status]?.length > 0 && (
            <button
              onClick={() => {
                setStatusModal(row.original);
                setNewStatus(STATUS_NEXT[row.original.status][0]);
                setCancelReason("");
              }}
              className="text-xs text-gray-500 hover:underline"
            >
              Statut
            </button>
          )}
        </div>
      ),
    },
  ], [canUpdate, filters]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta.total} résultats</p>
        </div>
        <button onClick={exportCsv} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          ↓ Export CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            placeholder="Rechercher (référence, nom, téléphone)..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="input flex-1 min-w-[220px]"
          />
          <select
            value={filters.status ?? ""}
            onChange={(e) => handleFilter("status", e.target.value)}
            className="input w-auto"
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <select
            value={filters.center_id ?? ""}
            onChange={(e) => handleFilter("center_id", e.target.value)}
            className="input w-auto"
          >
            <option value="">Tous les centres</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => handleFilter("date_from", e.target.value)}
            className="input w-auto"
            placeholder="Du"
          />
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => handleFilter("date_to", e.target.value)}
            className="input w-auto"
            placeholder="Au"
          />
          <button
            onClick={() => {
              setSearch("");
              setFilters({ page: 1, per_page: 20 });
            }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg border border-gray-200"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <DataTable
          data={appointments}
          columns={columns}
          loading={loading}
          emptyMessage="Aucun rendez-vous trouvé."
        />
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
        />
      </div>

      {/* Modal détail */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`RDV — ${selected?.reference_number}`}
        size="lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Statut</p>
                <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Type</p>
                <p className="font-medium">{selected.request_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Date rendez-vous</p>
                <p className="font-medium">{formatDate(selected.appointment_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Centre</p>
                <p className="font-medium">{selected.center?.name}</p>
              </div>
            </div>
            <hr />
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Demandeur</p>
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-gray-400">Nom complet</p><p>{selected.applicant?.last_name} {selected.applicant?.first_name}</p></div>
                <div><p className="text-xs text-gray-400">Téléphone</p><p>{selected.applicant?.phone}</p></div>
                <div><p className="text-xs text-gray-400">Date naissance</p><p>{selected.applicant?.birth_date ? formatDate(selected.applicant.birth_date) : "—"}</p></div>
                <div><p className="text-xs text-gray-400">Lieu naissance</p><p>{selected.applicant?.birth_place ?? "—"}</p></div>
              </div>
            </div>
            {selected.declarant && (
              <>
                <hr />
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Déclarant</p>
                  <p>{selected.declarant.last_name} {selected.declarant.first_name} — {selected.declarant.phone}</p>
                </div>
              </>
            )}
            {selected.qr_scanned_at && (
              <div className="bg-green-50 rounded-lg p-3 text-green-800 text-xs">
                Scanné le {formatDateTime(selected.qr_scanned_at)}
              </div>
            )}
            <hr />
            <button
              onClick={async () => {
                setPdfLoading(true);
                try { await appointmentsService.downloadPdf(selected.id); }
                finally { setPdfLoading(false); }
              }}
              disabled={pdfLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
            >
              {pdfLoading ? "Génération en cours…" : "📄 Télécharger le ticket PDF"}
            </button>
          </div>
        )}
      </Modal>

      {/* Modal changement statut */}
      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title="Changer le statut"
        size="sm"
      >
        {statusModal && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Rendez-vous <strong>{statusModal.reference_number}</strong>
            </p>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Nouveau statut</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="input"
              >
                {STATUS_NEXT[statusModal.status].map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            {newStatus === "cancelled" && (
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Motif annulation</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="input"
                  placeholder="Motif..."
                />
              </div>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStatusModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleStatusUpdate} disabled={saving} className="flex-1 py-2 bg-blue-900 text-white rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50">
                {saving ? "..." : "Confirmer"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
