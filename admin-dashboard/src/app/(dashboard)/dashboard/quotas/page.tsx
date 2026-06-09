"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { quotaService } from "@/services/quota.service";
import { formatDate } from "@/lib/utils";
import type { Center, CenterClosure, PublicHoliday, Quota, TimeSlotTemplate } from "@/types";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/types";

// ─── Types locaux ─────────────────────────────────────────────

type Tab = "quotas" | "closures" | "holidays" | "timeslots";

// ─── Sous-composants ──────────────────────────────────────────

function SlotBadge({ quota }: { quota: Quota }) {
  const pct = quota.total_slots > 0
    ? Math.round((quota.booked_slots / quota.total_slots) * 100)
    : 0;

  if (quota.is_suspended) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        ⏸ Suspendu
      </span>
    );
  }
  if (pct >= 100) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Complet
      </span>
    );
  }
  if (pct >= 75) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        {quota.available_slots} place{quota.available_slots > 1 ? "s" : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      {quota.available_slots} place{quota.available_slots > 1 ? "s" : ""}
    </span>
  );
}

// ─── Page principale ──────────────────────────────────────────

export default function QuotasPage() {
  const { hasPermission } = useAdminAuth();
  const canManage = hasPermission("quotas.create") || hasPermission("quotas.update");

  const [tab, setTab] = useState<Tab>("quotas");
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Quotas
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loadingQuotas, setLoadingQuotas] = useState(false);

  // Fermetures
  const [closures, setClosures] = useState<CenterClosure[]>([]);

  // Jours fériés
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

  // Créneaux horaires
  const [timeSlots, setTimeSlots] = useState<TimeSlotTemplate[]>([]);

  // Modales
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState<Quota | null>(null);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showGenerateSlotsModal, setShowGenerateSlotsModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Chargement initial ────────────────────────────────────────

  useEffect(() => {
    api.get<ApiResponse<Center[]>>("/admin/centers").then(({ data }) => {
      setCenters(data.data);
      if (data.data.length > 0) setSelectedCenter(data.data[0].id);
    });

    quotaService.listHolidays().then(setHolidays);
    quotaService.listTimeSlots().then(setTimeSlots);
  }, []);

  const loadQuotas = useCallback(async () => {
    if (!selectedCenter) return;
    setLoadingQuotas(true);
    try {
      const data = await quotaService.list(selectedCenter, selectedMonth);
      setQuotas(data);
    } finally {
      setLoadingQuotas(false);
    }
  }, [selectedCenter, selectedMonth]);

  const loadClosures = useCallback(async () => {
    if (!selectedCenter) return;
    const data = await quotaService.listClosures(selectedCenter);
    setClosures(data);
  }, [selectedCenter]);

  useEffect(() => {
    if (tab === "quotas") loadQuotas();
    if (tab === "closures") loadClosures();
  }, [tab, loadQuotas, loadClosures]);

  // ── Helpers ───────────────────────────────────────────────────

  const notify = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const handleSuspend = async (quota: Quota, reason: string) => {
    try {
      await quotaService.suspend(quota.id, reason);
      notify("Date suspendue.");
      loadQuotas();
      setShowSuspendModal(null);
    } catch {
      notify("Erreur lors de la suspension.", true);
    }
  };

  const handleReactivate = async (quota: Quota) => {
    try {
      await quotaService.reactivate(quota.id);
      notify("Date réactivée.");
      loadQuotas();
    } catch {
      notify("Erreur.", true);
    }
  };

  const handleUpdateTimeSlot = async (quota: Quota, newSlot: string) => {
    try {
      const updated = await quotaService.update(quota.id, { time_slot: newSlot || null });
      setQuotas((prev) => prev.map((q) => q.id === quota.id ? updated : q));
      notify("Créneau mis à jour.");
    } catch {
      notify("Erreur lors de la mise à jour.", true);
    }
  };

  const handleDelete = async (quota: Quota) => {
    if (quota.booked_slots > 0) {
      notify("Impossible : des réservations existent.", true);
      return;
    }
    if (!confirm("Supprimer ce quota ?")) return;
    try {
      await quotaService.remove(quota.id);
      notify("Quota supprimé.");
      loadQuotas();
    } catch {
      notify("Erreur lors de la suppression.", true);
    }
  };

  const handleDeleteClosure = async (id: string) => {
    if (!confirm("Supprimer cette fermeture ?")) return;
    try {
      await quotaService.deleteClosure(id);
      notify("Fermeture supprimée.");
      loadClosures();
    } catch {
      notify("Erreur.", true);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm("Supprimer ce jour férié ?")) return;
    try {
      await quotaService.deleteHoliday(id);
      const data = await quotaService.listHolidays();
      setHolidays(data);
      notify("Jour férié supprimé.");
    } catch {
      notify("Erreur.", true);
    }
  };

  const centerName = centers.find((c) => c.id === selectedCenter)?.name ?? "";

  // ── Rendu ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des quotas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Disponibilités, fermetures et jours fériés
          </p>
        </div>
      </div>

      {/* Notifications */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {(["quotas", "closures", "holidays", "timeslots"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "quotas"    && "Quotas journaliers"}
              {t === "closures"  && "Fermetures"}
              {t === "holidays"  && "Jours fériés"}
              {t === "timeslots" && "⏰ Créneaux"}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Onglet Quotas ──────────────────────────────────────── */}
      {tab === "quotas" && (
        <div className="space-y-4">
          {/* Filtres + actions */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Centre</label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Mois</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {canManage && (
              <div className="flex gap-2 ml-auto flex-wrap">
                <button
                  onClick={() => setShowSingleModal(true)}
                  className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  + Date unique
                </button>
                <button
                  onClick={() => setShowGenerateSlotsModal(true)}
                  className="px-3 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-600"
                >
                  ⏰ Créneaux du jour
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800"
                >
                  Génération en masse
                </button>
              </div>
            )}
          </div>

          {/* Tableau */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loadingQuotas ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : quotas.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Aucun quota configuré pour ce mois.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Créneau</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Réservés</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dispo</th>
                    {canManage && (
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quotas.map((quota) => (
                    <tr key={quota.id} className={quota.is_suspended ? "bg-gray-50 opacity-70" : "hover:bg-gray-50"}>
                      <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {formatDate(quota.date)}
                      </td>
                      <td className="px-4 py-3">
                        {canManage
                          ? <TimeSlotEditor
                              value={quota.time_slot}
                              onSave={(v) => handleUpdateTimeSlot(quota, v)}
                            />
                          : quota.time_slot
                            ? <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold">{quota.time_slot}</span>
                            : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">{quota.total_slots}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{quota.booked_slots}</td>
                      <td className="px-4 py-3 text-center">
                        <SlotBadge quota={quota} />
                        {quota.is_suspended && quota.suspension_reason && (
                          <p className="text-xs text-gray-400 mt-0.5">{quota.suspension_reason}</p>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            {quota.is_suspended ? (
                              <button onClick={() => handleReactivate(quota)} className="text-xs text-green-600 hover:underline">Réactiver</button>
                            ) : (
                              <button onClick={() => setShowSuspendModal(quota)} className="text-xs text-orange-600 hover:underline">Suspendre</button>
                            )}
                            <button onClick={() => handleDelete(quota)} className="text-xs text-red-500 hover:underline">Supprimer</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Onglet Fermetures ────────────────────────────────────── */}
      {tab === "closures" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={selectedCenter}
              onChange={(e) => setSelectedCenter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {canManage && (
              <button
                onClick={() => setShowClosureModal(true)}
                className="ml-auto px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800"
              >
                + Ajouter une fermeture
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {closures.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                Aucune fermeture planifiée.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Du</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Au</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Motif</th>
                    {canManage && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {closures.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{formatDate(c.date_from)}</td>
                      <td className="px-4 py-3 text-gray-900">{formatDate(c.date_to)}</td>
                      <td className="px-4 py-3 text-gray-500">{c.reason ?? "—"}</td>
                      {canManage && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteClosure(c.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            Supprimer
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Onglet Jours fériés ───────────────────────────────────── */}
      {tab === "holidays" && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowHolidayModal(true)}
                className="px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800"
              >
                + Ajouter un jour férié
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  {canManage && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{h.name}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {h.is_recurring
                        ? new Date(h.date).toLocaleDateString("fr-GN", { day: "2-digit", month: "long" })
                        : formatDate(h.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.is_recurring
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {h.is_recurring ? "Récurrent" : "Ponctuel"}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Supprimer
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Onglet Créneaux horaires ──────────────────────────────── */}
      {tab === "timeslots" && (
        <TimeSlotsTab
          slots={timeSlots}
          canManage={canManage}
          onUpdate={setTimeSlots}
          onNotify={notify}
        />
      )}

      {/* ── Modales ───────────────────────────────────────────────── */}

      {showBulkModal && (
        <BulkModal
          centerId={selectedCenter}
          centerName={centerName}
          timeSlots={timeSlots}
          onClose={() => setShowBulkModal(false)}
          onSuccess={(msg) => { notify(msg); loadQuotas(); }}
          onError={(msg) => notify(msg, true)}
        />
      )}

      {showSingleModal && (
        <SingleQuotaModal
          centerId={selectedCenter}
          timeSlots={timeSlots}
          onClose={() => setShowSingleModal(false)}
          onSuccess={() => { notify("Quota créé."); loadQuotas(); }}
          onError={(msg) => notify(msg, true)}
        />
      )}

      {showGenerateSlotsModal && (
        <GenerateSlotsModal
          centerId={selectedCenter}
          centerName={centerName}
          timeSlots={timeSlots}
          onClose={() => setShowGenerateSlotsModal(false)}
          onSuccess={(msg) => { notify(msg); loadQuotas(); }}
          onError={(msg) => notify(msg, true)}
        />
      )}

      {showSuspendModal && (
        <SuspendModal
          quota={showSuspendModal}
          onClose={() => setShowSuspendModal(null)}
          onConfirm={(reason) => handleSuspend(showSuspendModal, reason)}
        />
      )}

      {showClosureModal && (
        <ClosureModal
          centerId={selectedCenter}
          onClose={() => setShowClosureModal(false)}
          onSuccess={() => { notify("Fermeture enregistrée."); loadClosures(); }}
          onError={(msg) => notify(msg, true)}
        />
      )}

      {showHolidayModal && (
        <HolidayModal
          onClose={() => setShowHolidayModal(false)}
          onSuccess={async () => {
            const data = await quotaService.listHolidays();
            setHolidays(data);
            notify("Jour férié ajouté.");
          }}
          onError={(msg) => notify(msg, true)}
        />
      )}
    </div>
  );
}

// ─── Modal : génération en masse ──────────────────────────────

function BulkModal({
  centerId,
  centerName,
  timeSlots,
  onClose,
  onSuccess,
  onError,
}: {
  centerId: string;
  centerName: string;
  timeSlots: TimeSlotTemplate[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const slotCount = timeSlots.length || 4;
  const [form, setForm] = useState({
    date_from: "",
    date_to: "",
    total_slots: "80",
    slots_per_time_slot: "20",
    skip_weekends: true,
    overwrite: false,
    use_time_slots: true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await quotaService.bulk({
        center_id: centerId,
        date_from: form.date_from,
        date_to: form.date_to,
        total_slots: Number(form.total_slots),
        skip_weekends: form.skip_weekends,
        overwrite: form.overwrite,
        use_time_slots: form.use_time_slots,
        slots_per_time_slot: form.use_time_slots ? Number(form.slots_per_time_slot) : undefined,
      });
      onSuccess(result.message);
      onClose();
    } catch {
      onError("Erreur lors de la génération.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Génération en masse — {centerName}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du">
            <input type="date" required value={form.date_from}
              onChange={(e) => setForm({ ...form, date_from: e.target.value })}
              className="input" />
          </Field>
          <Field label="Au">
            <input type="date" required value={form.date_to}
              onChange={(e) => setForm({ ...form, date_to: e.target.value })}
              className="input" />
          </Field>
        </div>

        {/* Option créneaux */}
        <div className="bg-blue-50 rounded-xl p-3 space-y-3">
          <label className="flex items-center gap-2 text-sm text-blue-900 font-medium cursor-pointer">
            <input type="checkbox" checked={form.use_time_slots}
              onChange={(e) => setForm({ ...form, use_time_slots: e.target.checked })}
              className="rounded" />
            Utiliser les créneaux horaires (08h-10h, 10h-12h, 12h-14h, 14h-16h)
          </label>
          {form.use_time_slots ? (
            <Field label="Places par créneau">
              <input type="number" min={1} max={500} required value={form.slots_per_time_slot}
                onChange={(e) => setForm({ ...form, slots_per_time_slot: e.target.value })}
                className="input" />
              <p className="text-xs text-blue-600 mt-1">
                Total par jour : {Number(form.slots_per_time_slot) * slotCount} places ({slotCount} créneaux)
              </p>
            </Field>
          ) : (
            <Field label="Places par jour">
              <input type="number" min={1} max={500} required value={form.total_slots}
                onChange={(e) => setForm({ ...form, total_slots: e.target.value })}
                className="input" />
            </Field>
          )}
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.skip_weekends}
              onChange={(e) => setForm({ ...form, skip_weekends: e.target.checked })}
              className="rounded" />
            Ignorer week-ends
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.overwrite}
              onChange={(e) => setForm({ ...form, overwrite: e.target.checked })}
              className="rounded" />
            Écraser existants
          </label>
        </div>
        <ModalActions onClose={onClose} loading={loading} label="Générer" />
      </form>
    </ModalOverlay>
  );
}

// ─── Onglet Créneaux horaires ─────────────────────────────────

function TimeSlotsTab({
  slots,
  canManage,
  onUpdate,
  onNotify,
}: {
  slots: TimeSlotTemplate[];
  canManage: boolean;
  onUpdate: (slots: TimeSlotTemplate[]) => void;
  onNotify: (msg: string, isError?: boolean) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLabel.trim()) return;
    setAdding(true);
    try {
      const tpl = await quotaService.createTimeSlot({ label: addLabel.trim(), sort_order: slots.length + 1 });
      onUpdate([...slots, tpl]);
      onNotify("Créneau ajouté.");
      setAddLabel("");
      setShowAdd(false);
    } catch {
      onNotify("Erreur : ce libellé existe peut-être déjà.", true);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (tpl: TimeSlotTemplate) => {
    if (!confirm(`Supprimer le créneau "${tpl.label}" ?`)) return;
    try {
      await quotaService.deleteTimeSlot(tpl.id);
      onUpdate(slots.filter((s) => s.id !== tpl.id));
      onNotify("Créneau supprimé.");
    } catch {
      onNotify("Erreur lors de la suppression.", true);
    }
  };

  const handleRename = async (tpl: TimeSlotTemplate, newLabel: string) => {
    if (!newLabel.trim() || newLabel === tpl.label) return;
    try {
      const updated = await quotaService.updateTimeSlot(tpl.id, { label: newLabel.trim() });
      onUpdate(slots.map((s) => s.id === tpl.id ? updated : s));
      onNotify("Créneau mis à jour.");
    } catch {
      onNotify("Erreur : ce libellé existe peut-être déjà.", true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Ces créneaux sont disponibles lors de la création de quotas. Ils sont aussi utilisés dans les SMS et PDF.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800"
          >
            + Ajouter
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="flex gap-2 items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <input
            autoFocus
            type="text"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            placeholder="ex: 07h-09h"
            maxLength={15}
            className="input flex-1 font-mono"
          />
          <button type="submit" disabled={adding} className="px-3 py-1.5 bg-blue-900 text-white text-sm rounded-lg disabled:opacity-50">
            {adding ? "…" : "Ajouter"}
          </button>
          <button type="button" onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Annuler
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {slots.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Aucun créneau défini.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Libellé</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ordre</th>
                {canManage && <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {slots.map((tpl) => (
                <tr key={tpl.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {canManage
                      ? <TimeSlotEditor value={tpl.label} onSave={(v) => handleRename(tpl, v)} />
                      : <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold">{tpl.label}</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{tpl.sort_order}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(tpl)} className="text-xs text-red-500 hover:underline">
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Éditeur inline de créneau ───────────────────────────────

function TimeSlotEditor({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? "")) onSave(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter")  commit();
    if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder="ex: 07h-09h"
        maxLength={15}
        className="w-24 px-1.5 py-0.5 border border-blue-400 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value ?? ""); setEditing(true); }}
      title="Cliquer pour modifier"
      className="group flex items-center gap-1"
    >
      {value
        ? <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold group-hover:bg-blue-200 transition-colors">{value}</span>
        : <span className="text-gray-300 text-xs group-hover:text-gray-500 transition-colors">— modifier</span>
      }
      <span className="opacity-0 group-hover:opacity-100 text-gray-400 text-xs transition-opacity">✏️</span>
    </button>
  );
}

// ─── Modal : génération créneaux d'un jour ────────────────────

const TIME_SLOTS = ["08h-10h", "10h-12h", "12h-14h", "14h-16h"];

function GenerateSlotsModal({
  centerId,
  centerName,
  timeSlots,
  onClose,
  onSuccess,
  onError,
}: {
  centerId: string;
  centerName: string;
  timeSlots: TimeSlotTemplate[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [date, setDate] = useState("");
  const [slotsPerSlot, setSlotsPerSlot] = useState("20");
  const [loading, setLoading] = useState(false);

  const labels = timeSlots.length > 0 ? timeSlots.map((t) => t.label) : TIME_SLOTS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await quotaService.generateDaySlots({
        center_id: centerId,
        date,
        slots_per_slot: Number(slotsPerSlot),
      });
      onSuccess(result.message);
      onClose();
    } catch {
      onError("Erreur lors de la génération des créneaux.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Générer les créneaux du jour</h2>
      <p className="text-sm text-gray-500 mb-4">{centerName}</p>
      <div className="flex gap-2 flex-wrap mb-4">
        {labels.map((s) => (
          <span key={s} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold">{s}</span>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date">
          <input type="date" required value={date}
            onChange={(e) => setDate(e.target.value)} className="input" />
        </Field>
        <Field label="Places par créneau">
          <input type="number" min={1} max={500} required value={slotsPerSlot}
            onChange={(e) => setSlotsPerSlot(e.target.value)} className="input" />
          <p className="text-xs text-gray-400 mt-1">
            Total jour : {Number(slotsPerSlot) * TIME_SLOTS.length} places
          </p>
        </Field>
        <ModalActions onClose={onClose} loading={loading} label="Générer les 4 créneaux" />
      </form>
    </ModalOverlay>
  );
}

// ─── Modal : quota date unique ─────────────────────────────────

function SingleQuotaModal({
  centerId,
  timeSlots,
  onClose,
  onSuccess,
  onError,
}: {
  centerId: string;
  timeSlots: TimeSlotTemplate[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const slotLabels = timeSlots.length > 0 ? timeSlots.map((t) => t.label) : TIME_SLOTS;
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState("30");
  const [timeSlot, setTimeSlot] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await quotaService.create({
        center_id: centerId,
        date,
        time_slot: timeSlot || null,
        total_slots: Number(slots),
      });
      onSuccess();
      onClose();
    } catch {
      onError("Erreur : ce quota existe peut-être déjà.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter un quota</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Date">
          <input type="date" required value={date}
            onChange={(e) => setDate(e.target.value)} className="input" />
        </Field>
        <Field label="Créneau horaire (optionnel)">
          <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} className="input">
            <option value="">Aucun (quota journalier)</option>
            {slotLabels.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Nombre de places">
          <input type="number" min={1} max={500} required value={slots}
            onChange={(e) => setSlots(e.target.value)} className="input" />
        </Field>
        <ModalActions onClose={onClose} loading={loading} label="Créer" />
      </form>
    </ModalOverlay>
  );
}

// ─── Modal : suspension ───────────────────────────────────────

function SuspendModal({
  quota,
  onClose,
  onConfirm,
}: {
  quota: Quota;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Suspendre le {formatDate(quota.date)}</h2>
      <p className="text-sm text-gray-500 mb-4">
        {quota.booked_slots} réservation(s) existante(s) — aucune nouvelle réservation ne sera acceptée.
      </p>
      <Field label="Motif (optionnel)">
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Travaux, maintenance..."
          className="input"
        />
      </Field>
      <div className="flex gap-3 mt-4">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          Annuler
        </button>
        <button type="button" onClick={() => onConfirm(reason)}
          className="flex-1 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
          Suspendre
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal : fermeture centre ─────────────────────────────────

function ClosureModal({
  centerId,
  onClose,
  onSuccess,
  onError,
}: {
  centerId: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({ date_from: "", date_to: "", reason: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await quotaService.createClosure({
        center_id: centerId,
        date_from: form.date_from,
        date_to: form.date_to,
        reason: form.reason || undefined,
      });
      onSuccess();
      onClose();
    } catch {
      onError("Erreur lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Fermeture du centre</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du">
            <input type="date" required value={form.date_from}
              onChange={(e) => setForm({ ...form, date_from: e.target.value })}
              className="input" />
          </Field>
          <Field label="Au">
            <input type="date" required value={form.date_to}
              onChange={(e) => setForm({ ...form, date_to: e.target.value })}
              className="input" />
          </Field>
        </div>
        <Field label="Motif (optionnel)">
          <input type="text" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Congés, maintenance..." className="input" />
        </Field>
        <ModalActions onClose={onClose} loading={loading} label="Enregistrer" />
      </form>
    </ModalOverlay>
  );
}

// ─── Modal : jour férié ───────────────────────────────────────

function HolidayModal({
  onClose,
  onSuccess,
  onError,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    date: "",
    is_recurring: true,
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await quotaService.createHoliday({
        name: form.name,
        date: form.date,
        is_recurring: form.is_recurring,
        description: form.description || undefined,
      });
      onSuccess();
      onClose();
    } catch {
      onError("Erreur lors de l'ajout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter un jour férié</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nom">
          <input type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Fête de l'Indépendance" className="input" />
        </Field>
        <Field label={form.is_recurring ? "Date (année ignorée)" : "Date exacte"}>
          <input type="date" required value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.is_recurring}
            onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
            className="rounded" />
          Récurrent chaque année
        </label>
        <Field label="Description (optionnel)">
          <input type="text" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="input" />
        </Field>
        <ModalActions onClose={onClose} loading={loading} label="Ajouter" />
      </form>
    </ModalOverlay>
  );
}

// ─── Composants utilitaires ───────────────────────────────────

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({
  onClose,
  loading,
  label,
}: {
  onClose: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button type="button" onClick={onClose} disabled={loading}
        className="flex-1 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
        Annuler
      </button>
      <button type="submit" disabled={loading}
        className="flex-1 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800 disabled:opacity-50">
        {loading ? "..." : label}
      </button>
    </div>
  );
}
