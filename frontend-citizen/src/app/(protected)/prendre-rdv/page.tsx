import type { Metadata } from "next";
import { BookingProvider } from "@/contexts/BookingContext";
import { MultiStepForm } from "@/components/booking/MultiStepForm";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "Prendre un rendez-vous",
};

export default function PrendreRdvPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <AppHeader
        actions={<span className="text-xs text-gray-500">Prise de rendez-vous</span>}
      />

      {/* Contenu */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <BookingProvider>
            <MultiStepForm />
          </BookingProvider>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
