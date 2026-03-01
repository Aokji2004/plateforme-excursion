import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getCityImageUrl } from "../../utils/cityImages";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Excursion {
  id: number;
  title: string;
  city: string;
  hotelName: string;
  hotelCategory: string;
  type: "FAMILY" | "SINGLE" | "COUPLE";
  startDate: string;
  endDate: string;
  durationDays: number;
  totalSeats: number;
  status: "OPEN" | "FULL" | "CLOSED";
  description?: string | null;
  imageUrl?: string | null;
}

interface ExcursionApplication {
  id: number;
  excursion: Excursion;
  createdAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  inscriptionStatus?: "INSCRIT" | "SELECTIONNE" | "ATTENTE" | "FINAL" | "REFUSE";
  paymentConfirmed?: boolean;
}

interface UserPointsData {
  totalPoints: number;
  pointHistory: Array<{
    id: number;
    points: number;
    reason: string;
    createdAt: string;
  }>;
}

export default function EmployeeDashboard() {
  const router = useRouter();
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [applications, setApplications] = useState<ExcursionApplication[]>([]);
  const [pointsData, setPointsData] = useState<UserPointsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<number | null>(null);
  const [activeView, setActiveView] = useState<"activities" | "applications" | "history">("activities");

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        // Charger les activités disponibles
        const resExcursions = await fetch(`${API_BASE_URL}/excursions?status=OPEN`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resExcursions.ok) {
          throw new Error("Erreur lors du chargement des activités");
        }
        const excursionsData = await resExcursions.json();
        setExcursions(excursionsData);

        // Charger les candidatures de l'utilisateur
        const resApplications = await fetch(`${API_BASE_URL}/excursions/my-applications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null);
        
        if (resApplications?.ok) {
          const applicationsData = await resApplications.json();
          setApplications(applicationsData);
        }

        // Charger les points de l'utilisateur
        const resPoints = await fetch(`${API_BASE_URL}/users/my-points`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => null);
        
        if (resPoints?.ok) {
          const pointsDataResponse = await resPoints.json();
          setPointsData(pointsDataResponse);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function apply(excursionId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    setApplyingId(excursionId);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/excursions/${excursionId}/apply`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Erreur de candidature");
      }
      // Recharger la liste pour mettre à jour les places disponibles
      const resList = await fetch(`${API_BASE_URL}/excursions?status=OPEN`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (resList.ok) {
        const data = await resList.json();
        setExcursions(data);
      }
      // Afficher un message de succès plus élégant
      setError(null);
      // Optionnel: afficher une notification de succès
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successMessage.textContent = "✅ Candidature envoyée avec succès !";
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la candidature");
    } finally {
      setApplyingId(null);
    }
  }

  async function confirmPayment(applicationId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    setConfirmingPaymentId(applicationId);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/users/confirm-payment/${applicationId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Erreur lors de la confirmation du paiement");
      }
      // Recharger les candidatures
      const resApplications = await fetch(`${API_BASE_URL}/excursions/my-applications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (resApplications.ok) {
        const applicationsData = await resApplications.json();
        setApplications(applicationsData);
      }
      // Afficher un message de succès
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successMessage.textContent = "✅ Paiement confirmé avec succès ! Vous êtes dans la liste finale.";
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la confirmation du paiement");
    } finally {
      setConfirmingPaymentId(null);
    }
  }

  function getTypeLabel(type: string) {
    const typeMap: Record<string, string> = {
      FAMILY: "Excursion Famille",
      SINGLE: "Excursion Single",
      COUPLE: "Excursion Couple",
    };
    return typeMap[type] || type;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <p className="text-slate-600 text-sm">
          Chargement des activités disponibles…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* En-tête */}
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          Plateforme Excursion
        </h1>
        <div className="flex items-center gap-6">
          {/* Points en en-tête */}
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-lg">⭐</span>
            <div>
              <p className="text-xs text-slate-600">Points accumulés</p>
              <p className="text-lg font-bold text-emerald-600">
                {pointsData?.totalPoints ?? 0}
              </p>
            </div>
          </div>
          {/* Bouton déconnexion */}
          <button
            className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("ocp_token");
                localStorage.removeItem("ocp_user");
              }
              router.push("/login");
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Contenu principal avec sidebar */}
      <div className="flex flex-1">
        {/* Sidebar gauche - Navigation */}
        <aside className="w-64 bg-white shadow-sm border-r border-slate-200">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveView("activities")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                activeView === "activities"
                  ? "bg-emerald-100 text-emerald-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">🌍</span> Activités disponibles
            </button>
            <button
              onClick={() => setActiveView("applications")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                activeView === "applications"
                  ? "bg-emerald-100 text-emerald-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">📝</span> Mes candidatures (
              {applications.length})
            </button>
            <button
              onClick={() => setActiveView("history")}
              className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${
                activeView === "history"
                  ? "bg-emerald-100 text-emerald-900"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span className="text-lg">📊</span> Historique des points
            </button>
          </nav>
        </aside>

        {/* Contenu principal */}
        <main className="flex-1 py-6 px-4">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm flex items-center justify-between max-w-5xl">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900 ml-4 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Vue Activités disponibles */}
          {activeView === "activities" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Activités disponibles
              </h2>
              {excursions.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">
                  Aucune activité ouverte pour le moment.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
                  {excursions.map((excursion) => (
                    <div
                      key={excursion.id}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Image */}
                      <div className="relative h-40 bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden">
                        <img
                          src={excursion.imageUrl || getCityImageUrl(excursion.city)}
                          alt={excursion.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const fallbackUrl = getCityImageUrl(excursion.city);
                            const imgElement = e.target as HTMLImageElement;
                            if (imgElement.src !== fallbackUrl) {
                              imgElement.src = fallbackUrl;
                            } else {
                              imgElement.style.display = "none";
                            }
                          }}
                        />
                        <span className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                          Ouverte
                        </span>
                      </div>

                      {/* Contenu */}
                      <div className="p-4">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {excursion.title}
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">
                          {excursion.description ||
                            "Découvrez cette destination exceptionnelle"}
                        </p>

                        <div className="space-y-1 text-xs text-slate-600 mb-3">
                          <div>
                            <span className="font-medium">Type d'activité:</span>{" "}
                            {getTypeLabel(excursion.type)}
                          </div>
                          <div>
                            <span className="font-medium">Direction:</span>{" "}
                            {excursion.city}
                          </div>
                          <div>
                            <span className="font-medium">Places:</span>{" "}
                            {excursion.totalSeats}
                          </div>
                          <div>
                            <span className="font-medium">Date de départ:</span>{" "}
                            {new Date(excursion.startDate).toLocaleDateString(
                              "fr-FR"
                            )}
                          </div>
                          <div>
                            <span className="font-medium">Date de fin:</span>{" "}
                            {new Date(excursion.endDate).toLocaleDateString("fr-FR")}
                          </div>
                        </div>

                        {/* Bouton Candidater */}
                        <button
                          onClick={() => apply(excursion.id)}
                          disabled={applyingId === excursion.id}
                          className="w-full px-3 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {applyingId === excursion.id ? "Envoi..." : "Candidater"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vue Mes candidatures */}
          {activeView === "applications" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Mes candidatures
              </h2>
              {applications.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">
                  Vous n'avez candidaté à aucune activité.
                </p>
              ) : (
                <div className="space-y-4 max-w-4xl">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            {app.excursion.title}
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                            <div>
                              <span className="font-medium">Destination:</span>{" "}
                              {app.excursion.city}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span>{" "}
                              {getTypeLabel(app.excursion.type)}
                            </div>
                            <div>
                              <span className="font-medium">Date de départ:</span>{" "}
                              {new Date(app.excursion.startDate).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Date de fin:</span>{" "}
                              {new Date(app.excursion.endDate).toLocaleDateString(
                                "fr-FR"
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Durée:</span>{" "}
                              {app.excursion.durationDays} jour(s)
                            </div>
                            <div>
                              <span className="font-medium">Hôtel:</span>{" "}
                              {app.excursion.hotelName}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="mb-3">
                            <span
                              className={`inline-block px-4 py-2 rounded-lg font-medium text-sm ${
                                app.inscriptionStatus === "FINAL"
                                  ? "bg-green-100 text-green-800"
                                  : app.inscriptionStatus === "SELECTIONNE"
                                  ? "bg-blue-100 text-blue-800"
                                  : app.inscriptionStatus === "ATTENTE"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : app.inscriptionStatus === "REFUSE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {app.inscriptionStatus === "FINAL"
                                ? "✅ Paiement confirmé (FINAL)"
                                : app.inscriptionStatus === "SELECTIONNE"
                                ? "🎯 Sélectionné"
                                : app.inscriptionStatus === "ATTENTE"
                                ? "⏳ En attente"
                                : app.inscriptionStatus === "REFUSE"
                                ? "❌ Refusé"
                                : "📝 Inscrit"}
                            </span>
                          </div>
                          {app.inscriptionStatus === "SELECTIONNE" && !app.paymentConfirmed && (
                            <button
                              onClick={() => confirmPayment(app.id)}
                              disabled={confirmingPaymentId === app.id}
                              className="w-full px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                              {confirmingPaymentId === app.id ? "Confirmation..." : "Confirmer le paiement"}
                            </button>
                          )}
                          <p className="text-xs text-slate-500 mt-2">
                            Candidature du{" "}
                            {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vue Historique des points */}
          {activeView === "history" && (
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Historique des points
              </h2>
              {!pointsData?.pointHistory || pointsData.pointHistory.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">
                  Aucun historique disponible.
                </p>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden max-w-4xl">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">
                          Raison
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pointsData.pointHistory.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-sm text-slate-600">
                            {new Date(entry.createdAt).toLocaleDateString(
                              "fr-FR"
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-slate-900">
                            {entry.reason}
                          </td>
                          <td className="px-6 py-3 text-sm text-right font-semibold">
                            <span
                              className={
                                entry.points > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }
                            >
                              {entry.points > 0 ? "+" : ""}
                              {entry.points}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

