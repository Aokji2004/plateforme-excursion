import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { API_BASE_URL } from "../utils/config";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Erreur de connexion");
      }

      const data = await res.json();
      if (typeof window !== "undefined") {
        localStorage.setItem("ocp_token", data.token);
        localStorage.setItem("ocp_user", JSON.stringify(data.user));
      }

      if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/employee/dashboard");
      }
    } catch (err: any) {
      const msg = err?.message || "Erreur de connexion";
      const isNetworkError =
        msg === "Failed to fetch" ||
        msg === "NetworkError when attempting to fetch resource" ||
        err?.name === "TypeError";
      setError(
        isNetworkError
          ? "Impossible de joindre le serveur. Démarrez le backend (à la racine : npm run dev)."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Partie gauche : fond + texte (style système de réservation) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#0d9488] via-[#0e7c72] to-[#176139]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#176139]/95 via-[#176139]/70 to-[#176139]/30" />
        <div className="relative z-10 flex flex-col justify-end p-10 text-white">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4 drop-shadow">
            Système de réservation OCP
          </h1>
          <p className="text-base lg:text-lg text-white/95 max-w-md leading-relaxed">
            Le système de réservation des activités de l&apos;entreprise OCP permet aux
            collaborateurs de réserver facilement et en toute sécurité des activités
            pour eux-mêmes et leur famille.
          </p>
        </div>
      </div>

      {/* Partie droite : formulaire */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center bg-white p-8">
        <div className="w-full max-w-sm">
          {/* Logo / marque */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded bg-[#176139]" />
              <span className="text-xl font-semibold text-slate-700 tracking-tight">
                OCP Excursions
              </span>
            </div>
            <div className="w-9 h-9 rounded border border-slate-300 flex items-center justify-center text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Adresse email
              </label>
              <input
                type="email"
                required
                placeholder="exemple@ocp.ma"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#176139]/30 focus:border-[#176139] transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-500 mb-1.5">
                Mot de passe
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#176139]/30 focus:border-[#176139] transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#176139] focus:ring-[#176139]"
              />
              <label htmlFor="remember" className="text-sm text-slate-500">
                Se souvenir de moi
              </label>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#176139] text-white py-2.5 text-sm font-medium hover:bg-[#14522d] transition disabled:opacity-60 shadow-sm"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-4 text-center">
            <a
              href="#"
              className="text-sm text-[#176139] hover:underline"
            >
              Mot de passe oublié ?
            </a>
          </p>

          <p className="mt-12 text-center text-xs text-slate-400">
            © OCP Excursions {new Date().getFullYear()} — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
