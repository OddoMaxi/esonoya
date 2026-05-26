"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: "📊",
    permission: null,
  },
  {
    href: "/dashboard/rendez-vous",
    label: "Rendez-vous",
    icon: "📅",
    permission: "appointments.view",
  },
  {
    href: "/dashboard/scan-qr",
    label: "Scan QR",
    icon: "📷",
    permission: "qr.scan",
  },
  {
    href: "/dashboard/centres",
    label: "Centres",
    icon: "🏢",
    permission: "centers.view",
  },
  {
    href: "/dashboard/quotas",
    label: "Quotas",
    icon: "🗓️",
    permission: "quotas.view",
  },
  {
    href: "/dashboard/utilisateurs",
    label: "Utilisateurs",
    icon: "👥",
    permission: "admin-users.view",
  },
  {
    href: "/dashboard/statistiques",
    label: "Statistiques",
    icon: "📈",
    permission: "stats.view",
  },
  {
    href: "/dashboard/logs",
    label: "Logs",
    icon: "📝",
    permission: "audit-logs.view",
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, hasPermission, logout } = useAdminAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside className="w-60 shrink-0 bg-blue-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-blue-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <span className="text-blue-900 font-bold text-xs">eS</span>
          </div>
          <span className="font-bold text-sm">eSonoya Admin</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          // Masquer les items selon les permissions
          if (item.permission && !hasPermission(item.permission)) return null;

          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-blue-800"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-blue-800">
        {admin && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-white truncate">
              {admin.name}
            </p>
            <p className="text-xs text-blue-300 truncate">{admin.email}</p>
            <p className="text-xs text-blue-400 mt-0.5 capitalize">
              {admin.roles[0] ?? "—"}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-blue-300 hover:text-white transition-colors"
        >
          ⬅ Déconnexion
        </button>
      </div>
    </aside>
  );
}
