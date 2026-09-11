"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <section className="card p-8 md:p-12 text-center bg-gradient-to-br from-kanio-surface to-kanio-surface2">
        <p className="text-kanio-accent font-semibold tracking-wide text-sm mb-2">Le site officiel de paris du CANAL</p>
        <h1 className="text-3xl md:text-5xl font-black mb-4">
          Salut mon <span className="text-kanio-accent">BéBé</span>, Alors comme ca tu veux gagner des <span className="text-kanio-accent2">KanioS</span>
        </h1>
        <p className="text-kanio-muted max-w-2xl mx-auto mb-6">
          Alors les gosses, il va falloir Grand BOSSER!
          Inscris toi et parie gros!
        </p>
        <div className="flex items-center justify-center gap-3">
          {user ? (
            <Link href="/events" className="btn-primary">
              Voir les evenements
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn-primary">
                Creer un compte gratuit
              </Link>
              <Link href="/events" className="btn-secondary">
                Explorer sans compte
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-1">Solde de bienvenue</h3>
          <p className="text-sm text-kanio-muted">Chaque inscription offre un capital de depart en KANIO pour parier immediatement.</p>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-1">Cotes dynamiques</h3>
          <p className="text-sm text-kanio-muted">Les cotes evoluent selon les mises des joueurs, comme sur une vraie plateforme de paris.</p>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-1">Classement des joueurs</h3>
          <p className="text-sm text-kanio-muted">Grimpe dans le classement grace a tes gains, ton ROI virtuel et tes paris gagnants.</p>
        </div>
      </section>
    </div>
  );
}
