"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        maxWidth="max-w-3xl"
        actions={
          <>
            <span className="text-sm text-gray-600 hidden sm:block">{user?.phone}</span>
            <button onClick={handleLogout} className="text-sm text-red-600 hover:text-red-800 font-medium">
              Déconnexion
            </button>
          </>
        }
      />

      {/* Contenu */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">
          Mon espace citoyen
        </h1>

        {/* Actions rapides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/prendre-rdv"
            className="bg-blue-900 text-white rounded-xl p-5 hover:bg-blue-800 transition-colors"
          >
            <div className="text-2xl mb-2">📅</div>
            <h2 className="font-semibold text-lg">Prendre un rendez-vous</h2>
            <p className="text-blue-200 text-sm mt-1">
              Réserver un créneau pour votre passeport
            </p>
          </Link>

          <Link
            href="/mes-rdv"
            className="bg-white border border-gray-200 rounded-xl p-5 hover:bg-gray-50 transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <h2 className="font-semibold text-lg text-gray-900">
              Mes rendez-vous
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Consulter et gérer vos dossiers
            </p>
          </Link>
        </div>

        {/* Infos compte */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Mon compte</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Téléphone</span>
              <span className="font-medium text-gray-900">{user?.phone}</span>
            </div>
            {user?.email && (
              <div className="flex justify-between">
                <span>Email</span>
                <span className="font-medium text-gray-900">{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
