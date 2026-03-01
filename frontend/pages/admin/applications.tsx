import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Excursion {
  id: number;
  title: string;
  city: string;
  startDate: string;
  endDate: string;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  matricule: string | null;
}

interface Application {
  id: number;
  excursionId: number;
  userId: number;
  status: string;
  inscriptionStatus: string;
  paymentConfirmed: boolean;
  createdAt: string;
  excursion: Excursion;
  user: User;
}

const STATUT_LABELS: Record<string, string> = {
  FINAL: "Liste finale",
  ATTENTE: "Liste d'attente",
  SELECTIONNE: "Sélectionné",
  INSCRIT: "Inscrit",
  REFUSE: "Refusé",
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExcursionId, setSelectedExcursionId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchUserInput, setSearchUserInput] = useState("");
  const [filterExcursionId, setFilterExcursionId] = useState<string>("");
  const [searchGlobal, setSearchGlobal] = useState("");

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
    const userRaw =
      typeof window !== "undefined" ? localStorage.getItem("ocp_user") : null;
    if (!token || !userRaw) {
      router.replace("/login");
      return;
    }
    try {
      const user = JSON.parse(userRaw);
      if (user.role !== "ADMIN") {
        router.replace("/employee/dashboard");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }
    loadData(token);
  }, [router]);

  async function loadData(token: string) {
    try {
      setLoading(true);
      setError(null);
      const [resApps, resExcursions, resUsers] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/excursions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resApps.ok) {
        const data = await resApps.json();
        setApplications(data);
      } else {
        setApplications([]);
      }
      if (resExcursions.ok) {
        const data = await resExcursions.json();
        setExcursions(data);
      }
      if (resUsers.ok) {
        const data = await resUsers.json();
        setUsers(data);
      }
    } catch (e: any) {
      setError(e.message || "Erreur de chargement");
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredApplications = useMemo(() => {
    let list = applications;
    if (filterExcursionId) {
      const id = Number(filterExcursionId);
      if (Number.isInteger(id)) list = list.filter((a) => a.excursionId === id);
    }
    if (searchGlobal.trim()) {
      const q = searchGlobal.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.user?.firstName && a.user.firstName.toLowerCase().includes(q)) ||
          (a.user?.lastName && a.user.lastName.toLowerCase().includes(q)) ||
          (a.user?.matricule && a.user.matricule.toLowerCase().includes(q)) ||
          (a.user?.email && a.user.email.toLowerCase().includes(q)) ||
          (a.excursion?.title && a.excursion.title.toLowerCase().includes(q))
      );
    }
    return list;
  }, [applications, filterExcursionId, searchGlobal]);

  const filteredUsers = useMemo(
    () =>
      searchUserInput.trim()
        ? users.filter(
            (u) =>
              `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchUserInput.toLowerCase()) ||
              (u.email && u.email.toLowerCase().includes(searchUserInput.toLowerCase())) ||
              (u.matricule && u.matricule.toLowerCase().includes(searchUserInput.toLowerCase()))
          )
        : users,
    [users, searchUserInput]
  );

  async function handleAddApplication() {
    if (!selectedExcursionId || !selectedUserId) {
      setError("Veuillez sélectionner une activité et un employé");
      return;
    }
    const token =
      typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/applications/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          excursionId: selectedExcursionId,
          userId: selectedUserId,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors de l'ajout de l'inscription");
      }
      setIsModalOpen(false);
      setSelectedExcursionId(null);
      setSelectedUserId(null);
      setSearchUserInput("");
      await loadData(token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && applications.length === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
          Chargement…
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
        <h1 className="text-lg font-semibold text-slate-900">Inscriptions</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + Ajouter une inscription
        </button>
      </header>
      <main className="w-full max-w-full min-w-0 px-3 py-4 md:px-4 md:py-5">
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="font-bold text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Activité</label>
            <select
              value={filterExcursionId}
              onChange={(e) => setFilterExcursionId(e.target.value)}
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Toutes</option>
              {excursions.map((exc) => (
                <option key={exc.id} value={exc.id}>
                  {exc.title} ({exc.city})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Rechercher</label>
            <input
              type="text"
              placeholder="Nom, matricule, email, activité..."
              value={searchGlobal}
              onChange={(e) => setSearchGlobal(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium text-slate-700">Activité</th>
                <th className="px-2 py-1.5 text-left font-medium text-slate-700">Employé</th>
                <th className="px-2 py-1.5 text-left font-medium text-slate-700">Matricule</th>
                <th className="px-2 py-1.5 text-left font-medium text-slate-700">Date inscription</th>
                <th className="px-2 py-1.5 text-left font-medium text-slate-700">Statut</th>
                <th className="px-2 py-1.5 text-left font-medium text-slate-700">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-slate-500">
                    Aucune inscription trouvée. Utilisez « + Ajouter une inscription » pour en créer une.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5 text-slate-900">
                      <span className="font-medium">{app.excursion?.title ?? "—"}</span>
                      <span className="ml-1 text-slate-500">
                        {app.excursion?.city} ({app.excursion?.startDate ? formatDate(app.excursion.startDate) : ""})
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-900">
                      {app.user?.firstName} {app.user?.lastName}
                    </td>
                    <td className="px-2 py-1.5 text-slate-600">{app.user?.matricule ?? "—"}</td>
                    <td className="px-2 py-1.5 text-slate-700">{formatDate(app.createdAt)}</td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                          app.inscriptionStatus === "FINAL"
                            ? "bg-violet-100 text-violet-800"
                            : app.inscriptionStatus === "ATTENTE"
                              ? "bg-amber-100 text-amber-800"
                              : app.inscriptionStatus === "SELECTIONNE"
                                ? "bg-emerald-100 text-emerald-800"
                                : app.inscriptionStatus === "REFUSE"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUT_LABELS[app.inscriptionStatus] ?? app.inscriptionStatus}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-700">
                      {app.paymentConfirmed ? "Oui" : "Non"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && applications.length > 0 && (
          <p className="mt-3 text-sm text-slate-600">
            {filteredApplications.length} inscription(s)
            {(filterExcursionId || searchGlobal.trim()) ? " (filtré)" : ""}
          </p>
        )}
      </main>

      {/* Modal d'ajout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Ajouter une inscription manuelle
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Activité</label>
                <select
                  value={selectedExcursionId || ""}
                  onChange={(e) =>
                    setSelectedExcursionId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">— Sélectionner une activité —</option>
                  {excursions.map((exc) => (
                    <option key={exc.id} value={exc.id}>
                      {exc.title} – {exc.city} ({formatDate(exc.startDate)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employé</label>
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou matricule..."
                  value={searchUserInput}
                  onChange={(e) => setSearchUserInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                />
                {searchUserInput.trim() && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-300 bg-white">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-slate-500 text-sm">Aucun employé trouvé</div>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUserId(user.id);
                            setSearchUserInput(`${user.firstName} ${user.lastName}`);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 ${
                            selectedUserId === user.id ? "bg-emerald-100 border-l-4 border-emerald-600" : ""
                          }`}
                        >
                          <div className="font-medium text-slate-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-slate-600">
                            {user.email} {user.matricule ? `• ${user.matricule}` : ""}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedUserId && (
                  <div className="mt-2 rounded border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-sm text-emerald-900">
                    ✓ {users.find((u) => u.id === selectedUserId)?.firstName}{" "}
                    {users.find((u) => u.id === selectedUserId)?.lastName} sélectionné
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedExcursionId(null);
                  setSelectedUserId(null);
                  setSearchUserInput("");
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 text-sm hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleAddApplication}
                disabled={submitting || !selectedExcursionId || !selectedUserId}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
