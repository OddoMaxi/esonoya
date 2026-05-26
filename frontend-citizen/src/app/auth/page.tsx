import type { Metadata } from "next";
import { AuthForm } from "./AuthForm";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  const redirect = redirectParam ?? "/tableau-de-bord";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader maxWidth="max-w-md" />

      {/* Formulaire centré */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Entrez votre numéro de téléphone pour recevoir un code de
              vérification.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <AuthForm redirect={redirect} />
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Service sécurisé — Direction Nationale des Passeports
          </p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
