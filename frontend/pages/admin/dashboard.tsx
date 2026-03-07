import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { AdminLayout } from "../../components/AdminLayout";
import { getCityImageUrl } from "../../utils/cityImages";
import { API_BASE_URL } from "../../utils/config";

interface Stats {
  totalActivities: number;
  openActivities: number;
  closedActivities: number;
  fullActivities: number;
  totalApplications: number;
  totalUsers: number;
  usersWithFamilyStatus?: number;
  marriedCount?: number;
  totalChildren?: number;
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
        setError(null);
      } catch (e: any) {
        console.error("Erreur chargement stats:", e);
        const msg = e?.message || "";
        const isNetworkError =
          msg === "Failed to fetch" ||
          msg === "NetworkError when attempting to fetch resource" ||
          e?.name === "TypeError";
        setError(
          isNetworkError
            ? "Impossible de joindre le serveur. Vérifiez que le backend est démarré (dans le dossier backend : npm run dev) et que l'URL est correcte."
            : msg || "Erreur lors du chargement des statistiques."
        );
      } finally {
        setLoading(false);
      }
    }

    loadStats().catch(() => {});
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
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <h1 className="text-xl font-bold text-slate-900">
            Tableau de bord
          </h1>
          <p className="text-slate-600 mt-0.5 text-xs">
            Vue d'ensemble de la plateforme OCP Excursions
          </p>
        </header>

        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Bloc dédié : Agents & familles (situation familiale + enfants) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-[#176139]/10 border-b border-[#176139]/20 px-5 py-3">
              <h2 className="text-base font-semibold text-[#176139]">
                Agents & familles
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Situation familiale des agents et gestion des enfants (attribution automatique possible).
              </p>
            </div>
            <div className="p-4">
              {/* Mini indicateurs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Agents</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalUsers}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Avec sit. familiale</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.usersWithFamilyStatus ?? stats.totalUsers}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">sur {stats.totalUsers}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Marié(e)s</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.marriedCount ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Enfants</p>
                  <p className="text-xl font-bold text-slate-900 mt-0.5">{stats.totalChildren ?? 0}</p>
                </div>
              </div>
              {/* Rappel attribution auto */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 mb-5">
                <p className="text-xs text-amber-900">
                  <strong>Attribution automatique :</strong> sur la page Utilisateurs, les agents sans situation familiale reçoivent une attribution à chaque chargement.
                </p>
                <button
                  onClick={() => router.push("/admin/users")}
                  className="mt-1.5 text-xs font-medium text-[#176139] hover:underline"
                >
                  Aller à la liste des utilisateurs →
                </button>
              </div>
              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => router.push("/admin/family-status")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#176139] text-white text-xs font-medium hover:opacity-90 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Situation Familiale
                </button>
                <button
                  onClick={() => router.push("/admin/children")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Gestion des Enfants
                </button>
                <button
                  onClick={() => router.push("/admin/users")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
                >
                  Liste des utilisateurs
                </button>
              </div>
            </div>
          </div>

          {/* Cartes de statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total activités */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Total Activités
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.totalActivities}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total inscriptions */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Total Inscriptions
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.totalApplications}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Total utilisateurs */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Total Utilisateurs
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Activités clôturées */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Activités Clôturées
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {stats.closedActivities + stats.fullActivities}
                  </p>
                </div>
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Graphique en barres : Activités par statut */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                Activités par Statut
              </h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Ouvertes", value: stats.openActivities, fill: "#22c55e" },
                      { name: "Complètes", value: stats.fullActivities, fill: "#eab308" },
                      { name: "Clôturées", value: stats.closedActivities, fill: "#64748b" },
                    ]}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Nombre" radius={[4, 4, 0, 0]}>
                      <Cell fill="#22c55e" />
                      <Cell fill="#eab308" />
                      <Cell fill="#64748b" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Graphique circulaire : Activités par type */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                Activités par Type
              </h2>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Famille", value: stats.familyActivities, color: "#10b981" },
                        { name: "Couple", value: stats.coupleActivities, color: "#ec4899" },
                        { name: "Single", value: stats.singleActivities, color: "#14b8a6" },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => (percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : "")}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ec4899" />
                      <Cell fill="#14b8a6" />
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Activités"]} />
                    <Legend fontSize={11} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Graphique en barres : Inscriptions par statut */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
              Inscriptions par Statut
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Approuvées", value: stats.approvedApplications, fill: "#10b981" },
                    { name: "En attente", value: stats.pendingApplications, fill: "#eab308" },
                    { name: "Liste d'attente", value: stats.waitingListApplications, fill: "#f97316" },
                  ]}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 60, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
                  <Tooltip />
                  <Bar dataKey="value" name="Inscriptions" radius={[0, 4, 4, 0]}>
                    <Cell fill="#10b981" />
                    <Cell fill="#eab308" />
                    <Cell fill="#f97316" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activités clôturées récentes */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-800">
                Activités Clôturées Récentes
              </h2>
              <button
                onClick={() => router.push("/admin/activities")}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Voir tout →
              </button>
            </div>

            {stats.recentClosedActivities.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Aucune activité clôturée pour le moment.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {stats.recentClosedActivities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() =>
                      router.push(`/admin/activities/${activity.id}`)
                    }
                    className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* Image */}
                    <div className="relative h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden">
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
                        className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadgeClass(
                          activity.status
                        )}`}
                      >
                        {getStatusLabel(activity.status)}
                      </span>
                    </div>

                    {/* Contenu */}
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-900 mb-0.5 text-xs">
                        {activity.title}
                      </h3>
                      <div className="space-y-0.5 text-[10px] text-slate-600">
                        <div><span className="font-medium">Ville:</span> {activity.city}</div>
                        <div><span className="font-medium">Type:</span> {getTypeLabel(activity.type)} · {activity._count.applications}/{activity.totalSeats}</div>
                        <div>{new Date(activity.endDate).toLocaleDateString("fr-FR")}</div>
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
