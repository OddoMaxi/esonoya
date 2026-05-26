"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, Pagination } from "@/components/ui/DataTable";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ApiResponse } from "@/types";

interface AuditLog {
  id: string;
  admin_user_id: string | null;
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin_user?: { id: string; name: string; email: string } | null;
}

interface LogMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const ACTION_LABELS: Record<string, string> = {
  "admin.login":               "Connexion admin",
  "admin.logout":              "Déconnexion admin",
  "appointment.status_updated": "Statut RDV mis à jour",
  "center.created":            "Centre créé",
  "center.updated":            "Centre modifié",
  "center.deleted":            "Centre supprimé",
  "admin_user.created":        "Utilisateur créé",
  "admin_user.updated":        "Utilisateur modifié",
  "admin_user.deleted":        "Utilisateur supprimé",
  "qr.scanned":                "QR scanné",
  "qr.invalid_signature":      "QR invalide",
};

const ACTION_COLOR: Record<string, string> = {
  "admin.login":               "text-green-600 bg-green-50",
  "admin.logout":              "text-gray-600 bg-gray-50",
  "appointment.status_updated": "text-blue-600 bg-blue-50",
  "center.created":            "text-green-600 bg-green-50",
  "center.updated":            "text-blue-600 bg-blue-50",
  "center.deleted":            "text-red-600 bg-red-50",
  "admin_user.created":        "text-green-600 bg-green-50",
  "admin_user.updated":        "text-blue-600 bg-blue-50",
  "admin_user.deleted":        "text-red-600 bg-red-50",
  "qr.scanned":                "text-purple-600 bg-purple-50",
  "qr.invalid_signature":      "text-red-600 bg-red-50",
};

export default function LogsPage() {
  const [logs, setLogs]   = useState<AuditLog[]>([]);
  const [meta, setMeta]   = useState<LogMeta>({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
  const [loading, setLoading] = useState(true);

  const [actionFilter, setActionFilter]   = useState("");
  const [dateFrom, setDateFrom]           = useState("");
  const [dateTo, setDateTo]               = useState("");
  const [page, setPage]                   = useState(1);

  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), per_page: "50" };
      if (actionFilter) params.action = actionFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to   = dateTo;

      const { data } = await api.get<{ data: AuditLog[]; meta: LogMeta }>("/admin/audit-logs", { params });
      setLogs(data.data);
      setMeta(data.meta);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const subjectLabel = (type: string | null) => {
    if (!type) return "—";
    const parts = type.split("\\");
    return parts[parts.length - 1];
  };

  const columns: ColumnDef<AuditLog, unknown>[] = useMemo(() => [
    {
      header: "Date",
      accessorKey: "created_at",
      cell: ({ getValue }) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">{formatDateTime(getValue() as string)}</span>
      ),
    },
    {
      header: "Utilisateur",
      id: "user",
      cell: ({ row }) => (
        <div className="text-sm">
          <p className="font-medium text-gray-900">{row.original.admin_user?.name ?? "Système"}</p>
          <p className="text-xs text-gray-400">{row.original.admin_user?.email ?? ""}</p>
        </div>
      ),
    },
    {
      header: "Action",
      accessorKey: "action",
      cell: ({ getValue }) => {
        const action = getValue() as string;
        const color = ACTION_COLOR[action] ?? "text-gray-600 bg-gray-50";
        return (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {ACTION_LABELS[action] ?? action}
          </span>
        );
      },
    },
    {
      header: "Sujet",
      id: "subject",
      cell: ({ row }) => (
        <div className="text-xs text-gray-500">
          <span>{subjectLabel(row.original.subject_type)}</span>
          {row.original.subject_id && (
            <span className="font-mono text-gray-400 ml-1">{row.original.subject_id.slice(0, 8)}…</span>
          )}
        </div>
      ),
    },
    {
      header: "IP",
      accessorKey: "ip_address",
      cell: ({ getValue }) => <span className="font-mono text-xs text-gray-400">{getValue() as string ?? "—"}</span>,
    },
    {
      header: "",
      id: "expand",
      cell: ({ row }) => {
        const hasDetails = row.original.old_values || row.original.new_values;
        if (!hasDetails) return null;
        return (
          <button
            onClick={() => setExpanded(expanded === row.original.id ? null : row.original.id)}
            className="text-xs text-blue-600 hover:underline"
          >
            {expanded === row.original.id ? "Masquer" : "Détails"}
          </button>
        );
      },
    },
  ], [expanded]);

  const uniqueActions = useMemo(() => {
    const all = new Set(logs.map((l) => l.action));
    return Array.from(all).sort();
  }, [logs]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs d'audit</h1>
        <p className="text-sm text-gray-500 mt-0.5">{meta.total} entrée{meta.total > 1 ? "s" : ""}</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="input w-auto"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="input w-auto"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="input w-auto"
        />
        <button
          onClick={() => { setActionFilter(""); setDateFrom(""); setDateTo(""); setPage(1); }}
          className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          Réinitialiser
        </button>
      </div>

      {/* Tableau avec lignes expandables */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Date", "Utilisateur", "Action", "Sujet", "IP", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : logs.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Aucun log.</td>
                </tr>
              )
              : logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-gray-900">{log.admin_user?.name ?? "Système"}</p>
                          <p className="text-xs text-gray-400">{log.admin_user?.email ?? ""}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLOR[log.action] ?? "text-gray-600 bg-gray-50"}`}>
                          {ACTION_LABELS[log.action] ?? log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        <span>{subjectLabel(log.subject_type)}</span>
                        {log.subject_id && <span className="font-mono text-gray-400 ml-1">{log.subject_id.slice(0, 8)}…</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.ip_address ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {(log.old_values || log.new_values) && (
                          <button
                            onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {expanded === log.id ? "Masquer" : "Détails"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            {log.old_values && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1">Avant</p>
                                <pre className="bg-white border border-gray-200 rounded p-2 text-gray-700 overflow-auto max-h-32">
                                  {JSON.stringify(log.old_values, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div>
                                <p className="font-semibold text-gray-600 mb-1">Après</p>
                                <pre className="bg-white border border-gray-200 rounded p-2 text-gray-700 overflow-auto max-h-32">
                                  {JSON.stringify(log.new_values, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
            }
          </tbody>
        </table>
        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          perPage={meta.per_page}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
