import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "eSonoya — Rendez-vous Passeport",
    template: "%s | eSonoya",
  },
  description:
    "Plateforme officielle de prise de rendez-vous pour les passeports ordinaires guinéens.",
  keywords: ["passeport", "guinée", "rendez-vous", "eSonoya", "DGP"],
  authors: [{ name: "République de Guinée" }],
  robots: { index: false, follow: false }, // pas d'indexation en prod
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B4F72",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
