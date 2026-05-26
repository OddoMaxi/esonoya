"use client";

import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { centersService } from "@/services/centers.service";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { Center } from "@/types";

type CenterForm = {
  name: string; city: string; address: string;
  phone: string; email: string; is_active: boolean;
};

const EMPTY: CenterForm = { name: "", city: "", address: "", phone: "", email: "", is_active: true };

export default function CentresPage() {
  const { hasPermission } = useAdminAuth();
  const canWrite = hasPermission("centers.create") || hasPermission("centers.update");
  const canDelete = hasPermission("centers.delete");

  const [centers, setCenters]     = useState<Center[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState<"create" | "edit" | null>(null);
  const [editing, setEditing]     = useState<Center | null>(null);
  const [form, setForm]           = useState<CenterForm>(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const load = () => {
    setLoading(true);
    centersService.list().then(setCenters).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const openCreate = () => {
    setForm(EMPTY);
    setEditing(null);
    setModal("create");
  };

  const openEdit = (center: Center) => {
    setForm({
      name: center.name, city: center.city, address: center.address,
      phone: center.phone ?? "", email: center.email ?? "", is_active: center.is_active,
    });
    setEditing(center);
    setModal("edit");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        await centersService.create(form);
        notify("Centre créé avec succès.");
      } else if (editing) {
        await centersService.update(editing.id, form);
        notify("Centre mis à jour.");
      }
      setModal(null);
      load();
    } catch {
      setError("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (center: Center) => {
    if (!confirm(`Supprimer le centre "${center.name}" ?`)) return;
    try {
      await centersService.remove(center.id);
      notify("Centre supprimé.");
      load();
    } catch {
      notify("Impossible de supprimer ce centre.", true);
    }
  };

  const filtered = useMemo(
    () => centers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.city.toLowerCase().includes(search.toLowerCase())
    ),
    [centers, search]
  );

  const columns: ColumnDef<Center, unknown>[] = useMemo(() => [
    {
      header: "Centre",
      id: "name",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-gray-900">{row.original.name}</p>
          <p className="text-xs text-gray-400">{row.original.city}</p>
        </div>
      ),
    },
    {
      header: "Adresse",
      accessorKey: "address",
      cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue() as string}</span>,
    },
    {
      header: "Contact",
      id: "contact",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.phone && <p>{row.original.phone}</p>}
          {row.original.email && <p className="text-gray-400">{row.original.email}</p>}
        </div>
      ),
    },
    {
      header: "Statut",
      accessorKey: "is_active",
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "green" : "default"}>
          {getValue() ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      header: "",
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-3">
          {canWrite && (
            <button onClick={() => openEdit(row.original)} className="text-xs text-blue-600 hover:underline">
              Modifier
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(row.original)} className="text-xs text-red-500 hover:underline">
              Supprimer
            </button>
          )}
        </div>
      ),
    },
  ], [canWrite, canDelete]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Centres</h1>
          <p className="text-sm text-gray-500 mt-0.5">{centers.length} centre{centers.length > 1 ? "s" : ""}</p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800">
            + Nouveau centre
          </button>
        )}
      </div>

      {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{success}</div>}
      {error   && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="search"
          placeholder="Rechercher un centre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-sm"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <DataTable data={filtered} columns={columns} loading={loading} emptyMessage="Aucun centre trouvé." />
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Nouveau centre" : "Modifier le centre"}
        size="md"
      >
        <div className="space-y-4">
          {[
            { key: "name",    label: "Nom du centre",  required: true },
            { key: "city",    label: "Ville",          required: true },
            { key: "address", label: "Adresse",        required: true },
            { key: "phone",   label: "Téléphone",      required: false },
            { key: "email",   label: "Email",          required: false },
          ].map(({ key, label, required }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                {label}{required && " *"}
              </label>
              <input
                type={key === "email" ? "email" : "text"}
                value={form[key as keyof CenterForm] as string}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="input"
              />
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            Centre actif
          </label>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModal(null)} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-900 text-white rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
