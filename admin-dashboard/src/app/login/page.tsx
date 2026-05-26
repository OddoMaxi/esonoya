import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion administrateur — eSonoya",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold">eS</span>
        </div>
        <div>
          <p className="font-bold text-blue-900 text-lg leading-tight">
            eSonoya Admin
          </p>
          <p className="text-xs text-gray-500">Espace administration</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-200 p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
        <p className="text-sm text-gray-500 mb-6">
          Accès réservé aux agents autorisés.
        </p>
        <LoginForm />
      </div>

      <p className="text-xs text-gray-400 mt-6 text-center">
        eSonoya — Direction Générale des Passeports · République de Guinée
      </p>
    </div>
  );
}
