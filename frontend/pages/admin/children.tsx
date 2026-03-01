import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface UserOverview {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  matricule: string | null;
  childrenCount: number;
}

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
  parentId: number;
}

export default function AdminChildrenPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<{ users: UserOverview[]; totalChildren: number } | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const hasHandledUserIdQuery = useRef(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "MALE" as "MALE" | "FEMALE",
  });

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/admin/children/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur chargement vue d'ensemble");
      const data = await res.json();
      setOverview(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchChildrenForUser = async (userId: number) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/children/user/${userId}/children`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
      } else {
        setChildren([]);
      }
    } catch {
      setChildren([]);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (!router.isReady || !router.query.userId || !overview?.users.length || hasHandledUserIdQuery.current) return;
    const userIdFromQuery = Number(router.query.userId);
    if (!Number.isInteger(userIdFromQuery)) return;
    hasHandledUserIdQuery.current = true;
    const user = overview.users.find((u) => u.id === userIdFromQuery);
    if (user) {
      setSelectedUserId(user.id);
      setSearchInput("");
      fetchChildrenForUser(user.id);
    }
    router.replace("/admin/children", undefined, { shallow: true });
  }, [router.isReady, router.query.userId, overview]);

  const filteredUsers = useMemo(() => {
    if (!overview?.users) return [];
    if (!searchInput.trim()) return overview.users;
    const q = searchInput.trim().toLowerCase();
    return overview.users.filter(
      (u) =>
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.matricule && u.matricule.toLowerCase().includes(q))
    );
  }, [overview, searchInput]);

  const selectedUser = overview?.users.find((u) => u.id === selectedUserId);

  const handleSelectUser = (userId: number) => {
    setSelectedUserId(userId);
    setSearchInput("");
    fetchChildrenForUser(userId);
  };

  const handleClearSelection = () => {
    setSelectedUserId(null);
    setChildren([]);
    setSearchInput("");
  };

  const handleAddChild = () => {
    setFormData({ firstName: "", lastName: "", dateOfBirth: "", gender: "MALE" });
    setIsModalOpen(true);
  };

  const handleSaveChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !formData.firstName || !formData.lastName || !formData.dateOfBirth || !formData.gender) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    try {
      setSaving(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/admin/children/user/${selectedUserId}/children`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      setIsModalOpen(false);
      setFormData({ firstName: "", lastName: "", dateOfBirth: "", gender: "MALE" });
      await fetchChildrenForUser(selectedUserId);
      await fetchOverview();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async (childId: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet enfant ?")) return;
    try {
      setDeletingId(childId);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
      if (!token) {
        router.replace("/login");
        return;
      }
      const res = await fetch(`${API_BASE_URL}/admin/children/${childId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || `HTTP ${res.status}`);
      }
      if (selectedUserId) {
        await fetchChildrenForUser(selectedUserId);
        await fetchOverview();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
        <h1 className="text-lg font-semibold text-slate-900">Gestion des Enfants</h1>
      </header>
      <main className="w-full max-w-full min-w-0 px-3 py-4 md:px-4 md:py-5">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-slate-500 text-sm">Chargement…</div>
        ) : (
          <>
            {/* Statistiques */}
            {overview && (
              <div className="mb-4 flex flex-wrap gap-4">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <span className="text-slate-600 text-sm">Employés mariés</span>
                  <p className="text-lg font-semibold text-slate-900">{overview.users.length}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <span className="text-slate-600 text-sm">Enfants au total</span>
                  <p className="text-lg font-semibold text-emerald-700">{overview.totalChildren}</p>
                </div>
              </div>
            )}

            {/* Recherche + tableau des employés mariés */}
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-800">Employés mariés</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Seuls les employés « Marié(e) » peuvent avoir des enfants. Recherchez par nom, email ou matricule.
                </p>
                <div className="mt-3">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Rechercher par nom, email ou matricule..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {overview?.users.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  Aucun employé marié. Renseignez la situation familiale dans « Situation Familiale ».
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-700">Nom</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-700">Prénom</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-700">Email</th>
                        <th className="px-2 py-1.5 text-left font-medium text-slate-700">Matricule</th>
                        <th className="px-2 py-1.5 text-center font-medium text-slate-700">Nb enfants</th>
                        <th className="px-2 py-1.5 text-right font-medium text-slate-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className={`border-b border-slate-100 hover:bg-slate-50 ${selectedUserId === user.id ? "bg-emerald-50/50" : ""}`}
                        >
                          <td className="px-2 py-1.5 text-slate-900">{user.lastName}</td>
                          <td className="px-2 py-1.5 text-slate-900">{user.firstName}</td>
                          <td className="px-2 py-1.5 text-slate-600 truncate max-w-[180px]">{user.email}</td>
                          <td className="px-2 py-1.5 text-slate-600">{user.matricule || "—"}</td>
                          <td className="px-2 py-1.5 text-center">
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                              {user.childrenCount}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectUser(user.id)}
                              className="rounded bg-emerald-600 px-2 py-1 text-white text-xs font-medium hover:bg-emerald-700"
                            >
                              Gérer les enfants
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {searchInput.trim() && filteredUsers.length === 0 && overview && overview.users.length > 0 && (
                <div className="px-4 py-4 text-center text-slate-500 text-sm">
                  Aucun employé marié trouvé pour cette recherche.
                </div>
              )}
            </div>

            {/* Bloc employé sélectionné + liste des enfants */}
            {selectedUser && (
              <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-xs text-emerald-700">Employé sélectionné</p>
                      <p className="font-semibold text-emerald-900">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </p>
                      <p className="text-xs text-emerald-600">{selectedUser.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                    >
                      Changer
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddChild}
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    + Ajouter un enfant
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {children.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">Aucun enfant enregistré</div>
                  ) : (
                    children.map((child) => (
                      <div
                        key={child.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {child.firstName} {child.lastName} {child.gender === "MALE" ? "♂" : "♀"}
                          </p>
                          <p className="text-xs text-slate-600">
                            Né(e) le {new Date(child.dateOfBirth).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteChild(child.id)}
                          disabled={deletingId === child.id}
                          className="rounded bg-red-50 px-3 py-1 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                        >
                          {deletingId === child.id ? "Suppression…" : "Supprimer"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal ajout enfant */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Ajouter un enfant</h2>
              <form onSubmit={handleSaveChild} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sexe</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as "MALE" | "FEMALE" })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="MALE">Garçon</option>
                    <option value="FEMALE">Fille</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 text-sm hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
