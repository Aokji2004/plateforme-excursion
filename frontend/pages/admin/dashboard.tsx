import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";
import { getCityImageUrl } from "../../utils/cityImages";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Stats {
  totalActivities: number;
  openActivities: number;
  closedActivities: number;
  fullActivities: number;
  totalApplications: number;
  totalUsers: number;
  familyActivities: number;
  coupleActivities: number;
  singleActivities: number;
  approvedApplications: number;
  pendingApplications: number;
  waitingListApplications: number;
  recentClosedActivities: Array<{
    id: number;
    title: string;
    city: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    totalSeats: number;
    imageUrl: string | null;
    _count: {
      applications: number;
    };
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

    async function loadStats() {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(
            errorData?.message || "Erreur lors du chargement des statistiques"
          );
        }
        const data = await res.json();
        setStats(data);
      } catch (e: any) {
        console.error("Erreur chargement stats:", e);
        setError(
          e.message || "Erreur lors du chargement des statistiques. Vérifiez que le serveur backend est démarré."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [router]);

  function getStatusLabel(status: string) {
    switch (status) {
      case "OPEN":
        return "Ouverte";
      case "FULL":
        return "Complète";
      case "CLOSED":
        return "Clôturée";
      default:
        return status;
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800";
      case "FULL":
        return "bg-yellow-100 text-yellow-800";
      case "CLOSED":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  }

  function getTypeLabel(type: string) {
    const typeMap: Record<string, string> = {
      FAMILY: "Famille",
      SINGLE: "Single",
      COUPLE: "Couple",
    };
    return typeMap[type] || type;
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Chargement du tableau de bord...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h2 className="text-red-800 font-semibold mb-2">Erreur</h2>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="bg-slate-50 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-slate-600 mt-1">
            Vue d'ensemble de la plateforme OCP Excursions
          </p>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total activités */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Total Activités
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats.totalActivities}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total inscriptions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Total Inscriptions
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats.totalApplications}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total utilisateurs */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Total Utilisateurs
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Activités clôturées */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Activités Clôturées
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {stats.closedActivities + stats.fullActivities}
                  </p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activités par statut */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Activités par Statut
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Ouvertes
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    {stats.openActivities}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Complètes
                  </span>
                  <span className="text-lg font-bold text-yellow-700">
                    {stats.fullActivities}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Clôturées
                  </span>
                  <span className="text-lg font-bold text-slate-700">
                    {stats.closedActivities}
                  </span>
                </div>
              </div>
            </div>

            {/* Activités par type */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Activités par Type
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Famille
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {stats.familyActivities}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Couple
                  </span>
                  <span className="text-lg font-bold text-pink-700">
                    {stats.coupleActivities}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-700">
                    Single
                  </span>
                  <span className="text-lg font-bold text-emerald-700">
                    {stats.singleActivities}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inscriptions par statut */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Inscriptions par Statut
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-sm font-medium text-emerald-800 mb-1">
                  Approuvées
                </p>
                <p className="text-2xl font-bold text-emerald-900">
                  {stats.approvedApplications}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  En attente
                </p>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.pendingApplications}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-orange-800 mb-1">
                  Liste d'attente
                </p>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.waitingListApplications}
                </p>
              </div>
            </div>
          </div>

          {/* Activités clôturées récentes */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Activités Clôturées Récentes
              </h2>
              <button
                onClick={() => router.push("/admin/activities")}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Voir toutes les activités →
              </button>
            </div>

            {stats.recentClosedActivities.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">
                Aucune activité clôturée pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.recentClosedActivities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() =>
                      router.push(`/admin/activities/${activity.id}`)
                    }
                    className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden">
                      <img
                        src={
                          activity.imageUrl ||
                          getCityImageUrl(activity.city)
                        }
                        alt={activity.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const fallbackUrl = getCityImageUrl(activity.city);
                          const imgElement = e.target as HTMLImageElement;
                          if (imgElement.src !== fallbackUrl) {
                            imgElement.src = fallbackUrl;
                          } else {
                            imgElement.style.display = "none";
                          }
                        }}
                      />
                      <span
                        className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                          activity.status
                        )}`}
                      >
                        {getStatusLabel(activity.status)}
                      </span>
                    </div>

                    {/* Contenu */}
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 mb-1 text-sm">
                        {activity.title}
                      </h3>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div>
                          <span className="font-medium">Ville:</span>{" "}
                          {activity.city}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span>{" "}
                          {getTypeLabel(activity.type)}
                        </div>
                        <div>
                          <span className="font-medium">Inscriptions:</span>{" "}
                          {activity._count.applications} / {activity.totalSeats}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span>{" "}
                          {new Date(activity.endDate).toLocaleDateString(
                            "fr-FR"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </AdminLayout>
  );
}
