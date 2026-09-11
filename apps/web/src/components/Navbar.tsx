"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatKan } from "@/lib/format";

const LINKS = [
  { href: "/sports", label: "Sports" },
  { href: "/events", label: "Evenements" },
  { href: "/bets", label: "Mes paris" },
  { href: "/activite", label: "Activite" },
  { href: "/leaderboard", label: "Classement" },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-kanio-border bg-kanio-bg/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-xl font-black text-kanio-accent">KANIO</span>
          <span className="text-[10px] rounded bg-kanio-surface2 px-1.5 py-0.5 text-kanio-muted border border-kanio-border">
            KAN - fictif
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname?.startsWith(l.href) ? "bg-kanio-surface2 text-kanio-text" : "text-kanio-muted hover:text-kanio-text"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname?.startsWith("/admin") ? "bg-kanio-surface2 text-kanio-text" : "text-kanio-accent2 hover:text-kanio-text"
              }`}
            >
              Administration
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Link href="/wallet" className="text-sm font-semibold text-kanio-win rounded-lg px-3 py-1.5 bg-kanio-surface2 border border-kanio-border">
                {formatKan(user.balance)}
              </Link>
              <Link href="/profile" className="text-sm text-kanio-muted hover:text-kanio-text">
                {user.username}
              </Link>
              <button
                className="btn-secondary text-sm"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm">
                Connexion
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                Inscription
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-kanio-text" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-kanio-border bg-kanio-bg px-4 py-3 flex flex-col gap-1">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="px-3 py-2 rounded-lg text-kanio-text" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="px-3 py-2 rounded-lg text-kanio-accent2" onClick={() => setOpen(false)}>
              Administration
            </Link>
          )}
          <div className="h-px bg-kanio-border my-2" />
          {user ? (
            <>
              <Link href="/wallet" className="px-3 py-2 text-kanio-win font-semibold" onClick={() => setOpen(false)}>
                Solde : {formatKan(user.balance)}
              </Link>
              <Link href="/profile" className="px-3 py-2 text-kanio-muted" onClick={() => setOpen(false)}>
                Mon profil ({user.username})
              </Link>
              <button
                className="px-3 py-2 text-left text-kanio-loss"
                onClick={async () => {
                  await logout();
                  setOpen(false);
                  router.push("/");
                }}
              >
                Deconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 text-kanio-text" onClick={() => setOpen(false)}>
                Connexion
              </Link>
              <Link href="/register" className="px-3 py-2 text-kanio-accent" onClick={() => setOpen(false)}>
                Inscription
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
