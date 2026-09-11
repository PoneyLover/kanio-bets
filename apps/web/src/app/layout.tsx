import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BetSlipProvider } from "@/context/BetSlipContext";
import { Navbar } from "@/components/Navbar";
import { BetSlip } from "@/components/BetSlip";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "KANIO - Paris sportifs virtuels",
  description: "Plateforme de paris sportifs en monnaie virtuelle KANIO (KAN), sans aucune valeur reelle.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KANIO",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-kanio-bg text-kanio-text font-sans">
        <ServiceWorkerRegister />
        <AuthProvider>
          <BetSlipProvider>
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col lg:flex-row gap-6 pb-28 lg:pb-6">
              <main className="flex-1 min-w-0">{children}</main>
              <aside className="lg:block">
                <BetSlip />
              </aside>
            </div>
            <Footer />
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
