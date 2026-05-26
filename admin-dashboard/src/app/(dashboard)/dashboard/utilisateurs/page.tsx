"use client";

import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { usersService, type CreateUserPayload, type UpdateUserPayload } from "@/services/users.service";
import { centersService } from "@/services/centers.service";
import { formatDateTime } from "@/lib/utils";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { AdminUser, Center } from "@/types";

const ROLES = [
  { value: "super-admin",        label: "Super Admin" },
  { value: "admin-centre",       label: "Admin Centre" },
  { value: "agent-validation",   label: "Agent Validation" },
  { value: "statisticien",       label: "Statisticien" },
];

const ROLE_VARIANT: Record<string, "purple" | "blue" | "green" | "orange"> = {
  "super-admin":      "purple",
  "admin-centre":     "blue",
  "agent-validation": "green",
  "statisticien":     "orange",
};

type FormMode = "create" | "edit" | null;

interface UserForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  center_id: string;
  role: string;
  is_active: boolean;
}

const EMPTY_FORM: UserForm = {
  name: "", email: "", password: "", phone: "",
  center_id: "", role: "agent-validation", is_active: true,
};

export default function UtilisateursPage() {
  const { admin: me, hasPermission } = useAdminAuth();
  const canWrite = hasPermission("admin-users.create") || hasPermission("admin-users.update");
  const canDelete = hasPermission("admin-users.delete");

  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [modal, setModal]     = useState<FormMode>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm]       = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  const load = () => {
    setLoading(true);
    usersService.list().then(setUsers).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    centersService.list().then(setCenters);
  }, []);

  const notify = (msg: string, isErr = false) => {
    if (isErr) { setError(msg); setSuccess(""); }
    else { setSuccess(msg); setError(""); }
    setTimeout(() => { setError(""); setSuccess(""); }, 4000);
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setModal("create");
    setError("");
  };

  const openEdit = (user: AdminUser) => {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      phone: user.phone ?? "",
      center_id: user.center_id ?? "",
      role: user.roles[0] ?? "agent-validation",
      is_active: user.is_active,
    });
    setEditing(user);
    setModal("edit");
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      if (modal === "create") {
        const payload: CreateUserPayload = {
          name: form.name, email: form.email, password: form.password,
          phone: form.phone || undefined,
          center_id: form.center_id || undefined,
          role: form.role, is_active: form.is_active,
        };
        await usersService.create(payload);
        notify("Utilisateur créé.");
      } else if (editing) {
        const payload: UpdateUserPayload = {
          name: form.name, email: form.email,
          password: form.password || undefined,
          phone: form.phone || undefined,
          center_id: form.center_id || null,
          role: form.role, is_active: form.is_active,
        };
        await usersService.update(editing.id, payload);
        notify("Utilisateur mis à jour.");
      }
      setModal(null);
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.id === me?.id) { notify("Vous ne pouvez pas supprimer votre compte.", true); return; }
    if (!confirm(`Supprimer l'utilisateur "${user.name}" ?`)) return;
    try {
      await usersService.remove(user.id);
      notify("Utilisateur supprimé.");
      load();
    } catch {
      notify("Impossible de supprimer cet utilisateur.", true);
    }
  };

  const filtered = useMemo(() => users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.roles.includes(roleFilter);
    return matchSearch && matchRole;
  }), [users, search, roleFilter]);

  const columns: ColumnDef<AdminUser, unknown>[] = useMemo(() => [
    {
      header: "Utilisateur",
      id: "user",
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-gray-900 text-sm">{row.original.name}</p>
          <p className="text-xs text-gray-400">{row.original.email}</p>
        </div>
      ),
    },
    {
      header: "Rôle",
      id: "role",
      cell: ({ row }) => {
        const role = row.original.roles[0] ?? "—";
        return (
          <Badge variant={ROLE_VARIANT[role] ?? "default"}>
            {ROLES.find((r) => r.value === role)?.label ?? role}
          </Badge>
        );
      },
    },
    {
      header: "Centre",
      id: "center",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">{row.original.center?.name ?? "—"}</span>
      ),
    },
    {
      header: "Statut",
      accessorKey: "is_active",
      cell: ({ getValue }) => (
        <Badge variant={getValue() ? "green" : "default"}>{getValue() ? "Actif" : "Inactif"}</Badge>
      ),
    },
    {
      header: "Dernière connexion",
      accessorKey: "last_login_at",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-400">
          {getValue() ? formatDateTime(getValue() as string) : "Jamais"}
        </span>
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
          {canDelete && row.original.id !== me?.id && (
            <button onClick={() => handleDelete(row.original)} className="text-xs text-red-500 hover:underline">
              Supprimer
            </button>
          )}
        </div>
      ),
    },
  ], [canWrite, canDelete, me?.id]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} compte{users.length > 1 ? "s" : ""}</p>
        </div>
        {canWrite && (
          <button onClick={openCreate} className="px-4 py-2 text-sm bg-blue-900 text-white rounded-lg hover:bg-blue-800">
            + Nouvel utilisateur
          </button>
        )}
      </div>

      {success && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">{success}</div>}
      {error   && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input flex-1 min-w-[200px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <DataTable data={filtered} columns={columns} loading={loading} emptyMessage="Aucun utilisateur trouvé." />
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Nouvel utilisateur" : "Modifier l'utilisateur"}
        size="md"
      >
        <div className="space-y-4">
          {[
            { key: "name",  label: "Nom complet",  type: "text",     required: true },
            { key: "email", label: "Email",         type: "email",    required: true },
            { key: "phone", label: "Téléphone",     type: "tel",      required: false },
          ].map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-700 block mb-1">{label}{required && " *"}</label>
              <input
                type={type}
                value={form[key as keyof UserForm] as string}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="input"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">
              {modal === "create" ? "Mot de passe *" : "Nouveau mot de passe (laisser vide pour ne pas changer)"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              placeholder={modal === "edit" ? "••••••••" : ""}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Rôle *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Centre</label>
            <select value={form.center_id} onChange={(e) => setForm({ ...form, center_id: e.target.value })} className="input">
              <option value="">— Aucun centre —</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded"
            />
            Compte actif
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
