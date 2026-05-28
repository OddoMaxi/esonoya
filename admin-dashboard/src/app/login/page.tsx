import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "Connexion administrateur — eSonoya",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <AppHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-10">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/esonoya.png" alt="eSonoya" width={180} height={52} className="object-contain" />
          <p className="text-xs text-gray-500">Espace administration</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-md border border-gray-200 p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-1">Connexion</h1>
          <p className="text-sm text-gray-500 mb-6">
            Accès réservé aux agents autorisés.
          </p>
          <LoginForm />
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
