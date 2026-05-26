"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { statsService } from "@/services/stats.service";
import { centersService } from "@/services/centers.service";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, STATUS_LABEL } from "@/components/ui/Badge";
import type { Center, DashboardStats } from "@/types";

const PIE_COLORS   = ["#1d4ed8", "#16a34a", "#dc2626", "#d97706", "#7c3aed"];
const TYPE_LABELS  = { new: "Nouveau passeport", renewal: "Renouvellement", lost: "Passeport perdu" };
const TYPE_COLORS  = { new: "#1d4ed8", renewal: "#16a34a", lost: "#d97706" };

export default function StatistiquesPage() {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [centers, setCenters]   = useState<Center[]>([]);
  const [centerId, setCenterId] = useState("");
  const [loading, setLoading]   = useState(true);
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    centersService.list().then(setCenters);
  }, []);

  useEffect(() => {
    setLoading(true);
    statsService.get(centerId || undefined)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [centerId]);

  const exportCsv = () => {
    const url = statsService.exportUrl({
      ...(centerId ? { center_id: centerId } : {}),
      date_from: dateFrom,
      date_to:   dateTo,
    });
    window.open(url, "_blank");
  };

  const attendanceRate = stats?.counters.attendance_rate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
          <p className="text-sm text-gray-500 mt-0.5">Vue d'ensemble de l'activité eSonoya</p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Centre</label>
            <select value={centerId} onChange={(e) => setCenterId(e.target.value)} className="input text-sm" style={{ width: 190 }}>
              <option value="">Tous les centres</option>
              {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Du</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input text-sm w-auto" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Au</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input text-sm w-auto" />
          </div>
          <button onClick={exportCsv} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total RDV"       value={stats?.counters.total}         icon="📋" color="blue"   loading={loading} />
        <StatCard label="Ce mois"         value={stats?.counters.this_month}     icon="📅" color="purple" loading={loading} />
        <StatCard label="Taux présence"   value={attendanceRate != null ? `${attendanceRate}%` : "—"} icon="✅" color="green" loading={loading} />
        <StatCard label="Annulés"         value={stats?.counters.cancelled}      icon="🚫" color="red"    loading={loading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="En attente"      value={stats?.counters.pending}        icon="⏳" color="orange" loading={loading} />
        <StatCard label="Confirmés"       value={stats?.counters.confirmed}      icon="📌" color="blue"   loading={loading} />
        <StatCard label="Présents auj."   value={stats?.counters.today_present}  icon="👤" color="green"  loading={loading} />
        <StatCard label="Absents auj."    value={stats?.counters.today_absent}   icon="⚠️" color="red"    loading={loading} />
      </div>

      {/* Graphiques principaux */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aire 30 jours */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Évolution — 30 derniers jours</h3>
          {loading ? <div className="h-56 bg-gray-50 rounded-lg animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stats?.by_day ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.10}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("fr", { day: "2-digit", month: "2-digit" })}
                  interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString("fr-GN", { day: "numeric", month: "long" })}
                  formatter={(val, name) => [val, name === "total" ? "Total" : name === "present" ? "Présents" : "Absents"]}
                />
                <Legend formatter={(v) => v === "total" ? "Total" : v === "present" ? "Présents" : "Absents"} />
                <Area type="monotone" dataKey="total"   stroke="#1d4ed8" fill="url(#gTotal)"   strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="present" stroke="#16a34a" fill="url(#gPresent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="absent"  stroke="#dc2626" fill="url(#gAbsent)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut statuts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition par statut</h3>
          {loading ? <div className="h-56 bg-gray-50 rounded-lg animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats?.by_status ?? []} dataKey="total" nameKey="status"
                  cx="50%" cy="44%" innerRadius={60} outerRadius={88} paddingAngle={3}>
                  {(stats?.by_status ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, STATUS_LABEL[String(name)] ?? name]} />
                <Legend formatter={(v) => STATUS_LABEL[v] ?? v} iconType="circle" iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Types */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Types de demandes</h3>
          {loading ? <div className="h-48 bg-gray-50 rounded-lg animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.by_type ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v) => TYPE_LABELS[v as keyof typeof TYPE_LABELS] ?? v} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip formatter={(val, _, p) => [val, TYPE_LABELS[p.payload.type as keyof typeof TYPE_LABELS] ?? p.payload.type]} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {(stats?.by_type ?? []).map((d, i) => (
                    <Cell key={i} fill={TYPE_COLORS[d.type as keyof typeof TYPE_COLORS] ?? "#6b7280"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top centres */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Activité par centre</h3>
          {loading ? <div className="h-48 bg-gray-50 rounded-lg animate-pulse" /> : (
            <div className="space-y-3">
              {(stats?.by_center ?? []).slice(0, 5).map((c, i) => {
                const max = stats?.by_center[0]?.total ?? 1;
                const pct = Math.round((c.total / max) * 100);
                return (
                  <div key={c.center_id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{c.center_name}</span>
                      <span className="text-gray-500">{c.total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
