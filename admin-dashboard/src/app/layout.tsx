import type { Metadata } from "next";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "eSonoya Admin",
    template: "%s | eSonoya Admin",
  },
  description: "Tableau de bord administration eSonoya",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-gray-100 text-gray-900">
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </body>
    </html>
  );
}
