"use client";

import { useAuth } from "@/context/AuthContext";
import { formatDateTime, formatKan } from "@/lib/format";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <p className="text-kanio-muted">Connecte-toi pour voir ton profil.</p>;

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <div className="card p-6 space-y-4">
        <Row label="Nom d'utilisateur" value={user.username} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role === "ADMIN" ? "Administrateur" : "Joueur"} />
        <Row label="Statut du compte" value={user.status === "ACTIVE" ? "Actif" : "Suspendu"} />
        <Row label="Solde KANIO" value={formatKan(user.balance)} />
        <Row label="Membre depuis" value={formatDateTime(user.createdAt)} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-kanio-border pb-3 last:border-0 last:pb-0">
      <span className="text-kanio-muted text-sm">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
