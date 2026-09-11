"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, isApiError } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(username, email, password);
      router.push("/events");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto card p-8">
      <h1 className="text-2xl font-bold mb-2">Creer un compte</h1>
      <p className="text-sm text-kanio-muted mb-6">
        Un solde de bienvenue en KANIO (monnaie 100% virtuelle) te sera credite automatiquement.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-kanio-muted block mb-1">Nom d&apos;utilisateur</label>
          <input required minLength={3} maxLength={24} className="input w-full" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-kanio-muted block mb-1">Email</label>
          <input type="email" required className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-sm text-kanio-muted block mb-1">Mot de passe</label>
          <input
            type="password"
            required
            minLength={8}
            className="input w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-kanio-muted mt-1">8 caracteres min., avec majuscule, minuscule et chiffre.</p>
        </div>
        {error && <p className="text-sm text-kanio-loss">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "Creation..." : "Creer mon compte"}
        </button>
      </form>
      <p className="text-sm text-kanio-muted mt-4 text-center">
        Deja inscrit ?{" "}
        <Link href="/login" className="text-kanio-accent">
          Connecte-toi
        </Link>
      </p>
    </div>
  );
}
