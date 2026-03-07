import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../../../components/AdminLayout";

import { API_BASE_URL } from "../../../../utils/config";

interface Excursion {
  id: number;
  title: string;
  city: string;
  totalSeats: number;
  startDate: string;
  endDate: string;
  selectionStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CLOSED";
  paymentDeadline?: string | null;
  activityTypeId?: number | null;
  activityType?: { id: number; title: string } | null;
}

interface Participant {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  matricule: string;
  points: number;
  status: "INSCRIT" | "SELECTIONNE" | "ATTENTE" | "FINAL" | "REFUSE";
  selectionOrder: number | null;
  paymentConfirmed: boolean;
  paymentConfirmedDate?: string;
  createdAt: string;
  computedScore: number | null;
}

interface ParticipantsData {
  excursion: Excursion;
  stats: Record<string, number>;
  participants: Participant[];
  selectedCount: number;
  waitingCount: number;
  finalCount: number;
  totalCount: number;
}

export default function SelectionPage() {
  const router = useRouter();
  const { id } = router.query;
  const [excursion, setExcursion] = useState<Excursion | null>(null);
  const [participantsData, setParticipantsData] = useState<ParticipantsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [maxPlaces, setMaxPlaces] = useState("");
  const [sortBy, setSortBy] = useState<"points" | "date">("points");
  const [paymentDeadline, setPaymentDeadline] = useState("");

  useEffect(() => {
    if (!router.isReady) return;

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    const userRaw =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_user")
        : null;

    if (!token || !userRaw) {
      router.replace("/login");
      return;
    }

    const user = JSON.parse(userRaw);
    if (user.role !== "ADMIN") {
      router.replace("/employee/dashboard");
      return;
    }

    const excursionId = Array.isArray(id) ? id[0] : id;
    if (!excursionId || typeof excursionId !== "string") {
      setLoading(false);
      setError("Identifiant d'activité manquant.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await loadData(token, excursionId);
      } catch (_) {
        if (!cancelled) {
          try {
            setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré (port 4000).");
          } catch (_) {}
          try {
            setLoading(false);
          } catch (_) {}
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router.isReady, router]);

  async function loadData(token: string, excursionId: string): Promise<void> {
    if (!API_BASE_URL) {
      try {
        setError("URL de l'API non configurée. Vérifiez NEXT_PUBLIC_API_BASE_URL.");
        setLoading(false);
      } catch (_) {}
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const resExcursion = await fetch(`${API_BASE_URL}/excursions/${excursionId}?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });

      if (!resExcursion.ok) {
        throw new Error("Erreur lors du chargement de l'excursion");
      }
      const dataExc = await resExcursion.json();
      setExcursion(dataExc);
      setMaxPlaces(String(dataExc.totalSeats || ""));

      const resParticipants = await fetch(
        `${API_BASE_URL}/admin/selection/participants/${excursionId}?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );

      if (!resParticipants.ok) {
        throw new Error("Erreur lors du chargement des participants");
      }
      const dataPart = await resParticipants.json();
      setParticipantsData(JSON.parse(JSON.stringify(dataPart)));
    } catch (e: unknown) {
      try {
        const err = e as { message?: string; name?: string };
        const msg = String(err?.message || "");
        const isNetworkError =
          msg === "Failed to fetch" ||
          (typeof msg === "string" && msg.includes("NetworkError")) ||
          err?.name === "TypeError";
        setError(
          isNetworkError
            ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré (port 4000)."
            : msg || "Erreur de chargement"
        );
      } catch (_) {
        setError("Erreur de chargement");
      }
    } finally {
      try {
        setLoading(false);
      } catch (_) {}
    }
  }

  async function handleStartSelection() {
    if (!maxPlaces) {
      setError("Veuillez entrer le nombre de places");
      return;
    }

    const numPlaces = Number(maxPlaces);
    if (isNaN(numPlaces) || numPlaces <= 0) {
      setError("Veuillez entrer un nombre valide");
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);
    setError(null);
    setLoading(true);

    try {
      console.log(`🚀 Démarrage sélection: ${numPlaces} places`);
      
      // 1. Appeler l'API de sélection
      const res = await fetch(`${API_BASE_URL}/admin/selection/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
        },
        body: JSON.stringify({
          excursionId: Number(id),
          maxPlaces: numPlaces,
          sortBy,
          paymentDeadline: paymentDeadline || undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors du lancement de la sélection");
      }

      const result = await res.json();
      console.log("✅ Résultat API:", result);

      // 2. Attendre que le backend valide complètement l'opération
      await new Promise(resolve => setTimeout(resolve, 1200));

      // 3. Recharger l'excursion
      console.log("🔄 Rechargement de l'excursion...");
      const resExc = await fetch(`${API_BASE_URL}/excursions/${id}?t=${Date.now()}&nocache=${Math.random()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
        },
      });

      if (resExc.ok) {
        const excData = await resExc.json();
        console.log("Excursion chargée:", excData.selectionStatus);
        setExcursion(excData);
      }

      // 4. Recharger les participants
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("🔄 Rechargement des participants...");
      
      const resParticipants = await fetch(
        `${API_BASE_URL}/admin/selection/participants/${id}?t=${Date.now()}&nocache=${Math.random()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
          },
        }
      );

      if (resParticipants.ok) {
        const partData = await resParticipants.json();
        console.log("Participants chargés:", partData.selectedCount, "sélectionnés");
        // Force React re-render
        setParticipantsData(JSON.parse(JSON.stringify(partData)));
      }

      setError(null);
      alert(`✅ Sélection réussie!\n\n✓ ${result.selectedCount} participants sélectionnés\n✓ ${result.waitingCount} en attente\n\nCliquez sur "Voir les détails" pour afficher la liste complète.`);
      
    } catch (e: any) {
      console.error("❌ Erreur:", e);
      setError(e.message || "Erreur lors de la sélection");
      alert(`❌ Erreur: ${e.message}`);
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  }

  async function handleCloseSelection() {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir clôturer la sélection?")) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/selection/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        body: JSON.stringify({ excursionId: Number(id) }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.error ? `${body.message}: ${body.error}` : (body.message || "Erreur lors de la clôture");
        throw new Error(detail);
      }

      const data = await res.json();

      // Forcer refresh
      await new Promise(resolve => setTimeout(resolve, 800));
      const excursionId = Array.isArray(id) ? id[0] : id;
      if (excursionId && typeof excursionId === "string") await loadData(token, excursionId);
      
      setError(null);
      const pointsMsg = typeof data.pointsCreditedCount === "number" && data.pointsCreditedCount > 0
        ? `\n\n${data.pointsCreditedCount} participant(s) ont reçu leurs points pour cette activité.`
        : "";
      if (data.warnings && data.warnings.length > 0) {
        alert("⚠️ Sélection clôturée avec des avertissements :\n\n" + data.warnings.join("\n\n") + pointsMsg);
      } else {
        alert("✅ Sélection clôturée avec succès!" + pointsMsg);
      }
    } catch (e: any) {
      console.error("Erreur handleCloseSelection:", e);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          Chargement...
        </div>
      </AdminLayout>
    );
  }

  if (!excursion) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          <div className="text-center">
            <p className="text-red-600 mb-4">Activité non trouvée</p>
            <button
              onClick={() => router.push("/admin/activities")}
              className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Retour aux activités
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex-1 bg-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {excursion.title}
            </h1>
            <p className="text-slate-600">
              {excursion.city} • {excursion.totalSeats} places
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900 ml-4 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {excursion && !excursion.activityTypeId && excursion.selectionStatus !== "CLOSED" && (
            <div className="mb-4 rounded border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
              <strong>⚠️ Avertissement :</strong> Aucun type d&apos;activité (prestation) n&apos;est renseigné pour cette activité.
              À la clôture, les points ne seront pas crédités aux participants. Renseignez le type d&apos;activité dans la fiche activité (Modifier l&apos;activité).
            </div>
          )}

          {/* Statut de sélection */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900">
                Statut de la sélection
              </h2>
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {excursion.selectionStatus === "NOT_STARTED"
                  ? "Non commencée"
                  : excursion.selectionStatus === "IN_PROGRESS"
                  ? "En cours"
                  : excursion.selectionStatus === "COMPLETED"
                  ? "Terminée"
                  : "Clôturée"}
              </div>
            </div>

            {excursion.selectionStatus === "NOT_STARTED" && (
              <div className="space-y-4">
                {/* Critères de sélection — affichés avant le tri pour informer l'utilisateur */}
                <div className="bg-slate-50 border border-slate-300 rounded-lg p-5 mb-6">
                  <h3 className="font-semibold text-slate-900 mb-3 text-base">
                    📌 Critères de sélection (appliqués lors du tri)
                  </h3>
                  <ul className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                    <li>
                      <strong>Classification par points accumulés</strong> — Les agents sont classés en fonction du nombre total de points qu’ils ont accumulés.
                    </li>
                    <li>
                      <strong>Priorité aux points minimum</strong> — La priorité est donnée aux agents qui ont le minimum de points (ceux qui en ont le moins sont prioritaires).
                    </li>
                    <li>
                      <strong>En cas d’égalité de points</strong> — Priorité aux agents partant en retraite dans l’année en cours ; pour les autres à égalité, un tirage au sort est effectué.
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">📋 Processus de sélection</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✓ Les participants sont classés selon les critères ci-dessus</li>
                    <li>✓ Les N premiers deviennent &quot;<strong>SÉLECTIONNÉS</strong>&quot; (liste principale)</li>
                    <li>✓ Les autres deviennent &quot;<strong>EN ATTENTE</strong>&quot; (liste d&apos;attente)</li>
                    <li>✓ En cas d&apos;égalité, les règles d&apos;égalité (retraite / tirage au sort) s&apos;appliquent</li>
                  </ul>
                </div>

                <p className="text-slate-600 mb-6">
                  Configurez et lancez le processus de sélection des participants. Entrez le nombre de places à sélectionner.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nombre de places
                    </label>
                    <input
                      type="number"
                      value={maxPlaces}
                      onChange={(e) => setMaxPlaces(e.target.value)}
                      min="1"
                      max={excursion.totalSeats}
                      placeholder="Ex: 30"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg font-semibold"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Minimum: 1 | Maximum: {excursion.totalSeats}
                    </p>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Critère principal de sélection
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as "points" | "date")}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="points">Points bas en priorité (récompenser les moins actifs)</option>
                      <option value="date">Date d'inscription (anciens d'abord)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      {sortBy === "points"
                        ? "Points bas = Plus éligible (moins actif = plus de chance)"
                        : "Date ancienne = Plus éligible (anciens inscrits)"}
                    </p>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Limite de paiement (optionnel)
                    </label>
                    <input
                      type="date"
                      value={paymentDeadline}
                      onChange={(e) => setPaymentDeadline(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleStartSelection}
                    disabled={submitting || !maxPlaces}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-lg shadow-sm"
                  >
                    {submitting ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Lancement en cours...
                      </>
                    ) : (
                      "✓ Lancer la sélection"
                    )}
                  </button>
                  <button
                    onClick={() => router.push("/admin/activities")}
                    className="px-6 py-3 bg-slate-300 text-slate-900 rounded-lg hover:bg-slate-400 transition-colors font-medium"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {excursion.selectionStatus === "COMPLETED" && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-emerald-900 mb-2">✅ Sélection lancée avec succès!</h3>
                  {participantsData && (
                    <div className="text-sm text-emerald-800 space-y-1">
                      <p>📊 <strong>{participantsData.selectedCount}</strong> participants sélectionnés</p>
                      <p>⏳ <strong>{participantsData.waitingCount}</strong> participants en liste d'attente</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => router.push(`/admin/activities/${id}`)}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Voir les détails de l'activité
                </button>
                <button
                  onClick={handleCloseSelection}
                  disabled={submitting}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? "Clôture..." : "Clôturer la sélection"}
                </button>
              </div>
            )}

            {excursion.selectionStatus === "CLOSED" && (
              <p className="text-slate-600">
                La sélection a été clôturée. Les inscriptions ne sont plus acceptées.
              </p>
            )}
          </div>

          {/* Récapitulatif des statuts */}
          {participantsData && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Total inscriptions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {participantsData.totalCount}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Sélectionnés</p>
                <p className="text-2xl font-bold text-green-600">
                  {participantsData.selectedCount}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600">En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {participantsData.waitingCount}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Finaux</p>
                <p className="text-2xl font-bold text-purple-600">
                  {participantsData.finalCount}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                <p className="text-sm text-slate-600">Refusés</p>
                <p className="text-2xl font-bold text-red-600">
                  {participantsData.stats.REFUSE || 0}
                </p>
              </div>
            </div>
          )}

          {/* Liste complète des participants */}
          {participantsData && participantsData.participants.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">
                  Liste complète des participants ({participantsData.totalCount})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Rang
                      </th>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Nom
                      </th>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Matricule
                      </th>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Points
                      </th>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Statut
                      </th>
                      <th className="px-4 py-3 text-left text-slate-700 font-medium">
                        Date inscription
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {participantsData.participants.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-900 font-semibold">
                          {p.selectionOrder || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-900">{p.name}</td>
                        <td className="px-4 py-3 text-slate-900 text-xs">
                          {p.email}
                        </td>
                        <td className="px-4 py-3 text-slate-900">
                          {p.matricule || "-"}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-medium">
                          {p.points}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              p.status === "SELECTIONNE"
                                ? "bg-green-100 text-green-800"
                                : p.status === "ATTENTE"
                                ? "bg-yellow-100 text-yellow-800"
                                : p.status === "FINAL"
                                ? "bg-purple-100 text-purple-800"
                                : p.status === "REFUSE"
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-800"
                            }`}
                          >
                            {p.status === "INSCRIT"
                              ? "Inscrit"
                              : p.status === "SELECTIONNE"
                              ? "✓ Sélectionné"
                              : p.status === "ATTENTE"
                              ? "⏳ En attente"
                              : p.status === "FINAL"
                              ? "✓✓ Final"
                              : "✗ Refusé"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
