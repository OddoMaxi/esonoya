"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { statsService } from "@/services/stats.service";
import { centersService } from "@/services/centers.service";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, STATUS_LABEL, STATUS_VARIANT } from "@/components/ui/Badge";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import type { Center, DashboardStats } from "@/types";

const TYPE_LABELS: Record<string, string> = {
  new:     "Nouveau passeport",
  renewal: "Renouvellement",
  lost:    "Passeport perdu",
};

const PIE_COLORS = ["#1d4ed8", "#16a34a", "#dc2626", "#d97706", "#7c3aed"];

export default function DashboardPage() {
  const { admin } = useAdminAuth();
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [centers, setCenters]   = useState<Center[]>([]);
  const [centerId, setCenterId] = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    centersService.list().then(setCenters);
  }, []);

  useEffect(() => {
    setLoading(true);
    statsService
      .get(centerId || undefined)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [centerId]);

  const exportStats = () => {
    const url = statsService.exportUrl(
      centerId ? { center_id: centerId } : {}
    );
    window.open(url, "_blank");
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {admin?.name?.split(" ")[0] ?? "Administrateur"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("fr-GN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
            className="input text-sm"
            style={{ width: 200 }}
          >
            <option value="">Tous les centres</option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={exportStats}
            className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aujourd'hui"
          value={stats?.counters.today}
          sub="rendez-vous programmés"
          icon="📅"
          color="blue"
          loading={loading}
        />
        <StatCard
          label="Présents ce jour"
          value={stats?.counters.today_present}
          sub={`${stats?.counters.attendance_rate ?? "—"}% de présence`}
          icon="✅"
          color="green"
          loading={loading}
        />
        <StatCard
          label="Absents ce jour"
          value={stats?.counters.today_absent}
          icon="❌"
          color="red"
          loading={loading}
        />
        <StatCard
          label="Ce mois-ci"
          value={stats?.counters.this_month}
          sub={`${stats?.counters.total ?? "—"} au total`}
          icon="📊"
          color="purple"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="En attente"  value={stats?.counters.pending}   icon="⏳" color="orange" loading={loading} />
        <StatCard label="Confirmés"   value={stats?.counters.confirmed}  icon="📋" color="blue"   loading={loading} />
        <StatCard label="Annulés"     value={stats?.counters.cancelled}  icon="🚫" color="gray"   loading={loading} />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Courbe 30 jours */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Rendez-vous — 30 derniers jours
          </h3>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.by_day ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("fr", { day: "2-digit", month: "2-digit" })}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip
                  labelFormatter={(v) => new Date(v).toLocaleDateString("fr-GN", { day: "numeric", month: "long" })}
                  formatter={(val, name) => [val, name === "total" ? "Total" : name === "present" ? "Présents" : "Absents"]}
                />
                <Area type="monotone" dataKey="total"   stroke="#1d4ed8" fill="url(#colorTotal)"   strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="present" stroke="#16a34a" fill="url(#colorPresent)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Camembert statuts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Répartition par statut</h3>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats?.by_status ?? []}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {(stats?.by_status ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val, name) => [val, STATUS_LABEL[String(name)] ?? name]} />
                <Legend
                  formatter={(value) => STATUS_LABEL[value] ?? value}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Barres par centre */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Top centres</h3>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats?.by_center.slice(0, 5) ?? []}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis
                  dataKey="center_name"
                  type="category"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  width={90}
                />
                <Tooltip />
                <Bar dataKey="total" fill="#1d4ed8" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Types de demandes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Types de demandes</h3>
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats?.by_type ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="type"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  tickFormatter={(v) => TYPE_LABELS[v] ?? v}
                />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip formatter={(val, _, p) => [val, TYPE_LABELS[p.payload.type] ?? p.payload.type]} />
                <Bar dataKey="total" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
