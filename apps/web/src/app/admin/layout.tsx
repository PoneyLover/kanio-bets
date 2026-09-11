"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/AdminGuard";

const TABS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/events", label: "Evenements" },
  { href: "/admin/catalog", label: "Sports & equipes" },
  { href: "/admin/audit", label: "Journal d'audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminGuard>
      <div>
        <h1 className="text-2xl font-bold mb-1">Administration</h1>
        <p className="text-sm text-kanio-muted mb-6">Back-office KANIO - reserve aux administrateurs.</p>
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                pathname === t.href ? "bg-kanio-accent2 text-white border-kanio-accent2" : "border-kanio-border text-kanio-muted"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
    </AdminGuard>
  );
}
