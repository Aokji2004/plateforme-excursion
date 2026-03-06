import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface UserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  matricule: string | null;
  role: "ADMIN" | "EMPLOYEE";
  points: number;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | null;
  spouse?: string | null;
  spouseEmail?: string | null;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [matricule, setMatricule] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE");
  const [password, setPassword] = useState("");
  const [points, setPoints] = useState(0);
  
  // Informations familiales
  const [maritalStatus, setMaritalStatus] = useState<"SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "">("");
  const [spouse, setSpouse] = useState("");
  const [spouseEmail, setSpouseEmail] = useState("");
  
  // Informations personnelles supplémentaires (UI uniquement pour l'instant)
  const [cin, setCin] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "">("");
  const [address, setAddress] = useState("");

  function resetForm() {
    setEmail("");
    setFirstName("");
    setLastName("");
    setMatricule("");
    setRole("EMPLOYEE");
    setPassword("");
    setPoints(0);
    setMaritalStatus("");
    setSpouse("");
    setSpouseEmail("");
    setCin("");
    setBirthDate("");
    setBirthPlace("");
    setGender("");
    setAddress("");
    setEditingUserId(null);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  async function openEditModal(userId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Erreur lors du chargement de l'utilisateur");
      }
      const user = await res.json();
      setEditingUserId(user.id);
      setEmail(user.email);
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setMatricule(user.matricule || "");
      setRole(user.role);
      setPassword(""); // Ne pas pré-remplir le mot de passe
      setPoints(user.points);
      setMaritalStatus(user.maritalStatus || "");
      setSpouse(user.spouse || "");
      setSpouseEmail(user.spouseEmail || "");
      setIsModalOpen(true);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement de l'utilisateur");
    }
  }

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

    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("Erreur lors du chargement des utilisateurs");
        }
        const data = await res.json();
        setUsers(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function handleSubmitUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const url = editingUserId
        ? `${API_BASE_URL}/admin/users/${editingUserId}`
        : `${API_BASE_URL}/admin/users`;
      const method = editingUserId ? "PUT" : "POST";

      const body: any = {
        email,
        firstName,
        lastName,
        matricule: matricule || null,
        role,
        points,
        maritalStatus: maritalStatus || null,
        spouse: spouse || null,
        spouseEmail: spouseEmail || null,
        // champs additionnels (ignorés par le backend pour l'instant)
        cin,
        birthDate,
        birthPlace,
        gender,
        address,
      };

      // Le mot de passe n'est requis que lors de la création
      if (!editingUserId) {
        if (!password) {
          throw new Error("Le mot de passe est obligatoire pour la création");
        }
        body.password = password;
      } else if (password && password.trim() !== "") {
        // Optionnel lors de la modification
        body.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            (editingUserId
              ? "Erreur lors de la modification de l'utilisateur"
              : "Erreur lors de la création de l'utilisateur")
        );
      }

      const updated = await res.json();
      if (editingUserId) {
        setUsers((prev) =>
          prev.map((u) => (u.id === editingUserId ? updated : u))
        );
      } else {
        setUsers((prev) => [updated, ...prev]);
      }

      resetForm();
      setIsModalOpen(false);
    } catch (e: any) {
      setError(
        e.message ||
          (editingUserId
            ? "Erreur lors de la modification de l'utilisateur"
            : "Erreur lors de la création de l'utilisateur")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(userId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || "Erreur lors de la suppression de l'utilisateur"
        );
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeletingUserId(null);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la suppression de l'utilisateur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          Chargement des utilisateurs…
        </div>
      </AdminLayout>
    );
  }



  return (
    <AdminLayout>
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Les Utilisateurs
        </h1>
        <div className="flex gap-2">
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            Ajouter un utilisateur
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <section className="border border-slate-200 bg-white rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-medium mb-4">Liste des utilisateurs</h2>
          {users.length === 0 ? (
            <p className="text-sm text-slate-600">
              Aucun utilisateur pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      ID
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Matricule
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Nom
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Prénom
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Email
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Situation Familiale
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Rôle
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Points
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-2 py-1">
                        {u.id}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {u.matricule || "-"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {u.lastName}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {u.firstName}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {u.email}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-xs">
                        {u.maritalStatus ? (
                          <div>
                            <p>
                              {u.maritalStatus === "SINGLE" && "Célibataire"}
                              {u.maritalStatus === "MARRIED" && "Marié(e)"}
                              {u.maritalStatus === "DIVORCED" && "Divorcé(e)"}
                              {u.maritalStatus === "WIDOWED" && "Veuf(ve)"}
                            </p>
                            {u.spouse && <p className="text-gray-600">{u.spouse}</p>}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {u.role === "ADMIN" ? "Admin" : "Employé"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {u.points}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(u.id)}
                            className="px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700"
                            title="Modifier"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeletingUserId(u.id)}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                            title="Supprimer"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingUserId ? "Modifier l'utilisateur" : "Ajouter un utilisateur"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleSubmitUser}
              className="px-5 py-4 space-y-4 text-sm"
            >
              {/* Informations personnelles */}
              <div className="border border-slate-200 rounded-lg">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  Informations personnelles
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-3 py-3">
                  <div className="space-y-1">
                    <label className="block text-slate-700">Nom</label>
                    <input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">Prénom</label>
                    <input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">CIN</label>
                    <input
                      value={cin}
                      onChange={(e) => setCin(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">Email</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Lieu de naissance
                    </label>
                    <input
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Date de naissance
                    </label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="block text-slate-700">Sexe</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1 text-slate-700">
                        <input
                          type="radio"
                          value="M"
                          checked={gender === "M"}
                          onChange={() => setGender("M")}
                        />
                        <span>M</span>
                      </label>
                      <label className="flex items-center gap-1 text-slate-700">
                        <input
                          type="radio"
                          value="F"
                          checked={gender === "F"}
                          onChange={() => setGender("F")}
                        />
                        <span>F</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Situation familiale
                    </label>
                    <select
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value as any)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Non spécifié</option>
                      <option value="SINGLE">Célibataire</option>
                      <option value="MARRIED">Marié(e)</option>
                      <option value="DIVORCED">Divorcé(e)</option>
                      <option value="WIDOWED">Veuf(ve)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Nom du conjoint
                    </label>
                    <input
                      placeholder="Nom du conjoint"
                      value={spouse}
                      onChange={(e) => setSpouse(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Email du conjoint
                    </label>
                    <input
                      type="email"
                      placeholder="Email du conjoint"
                      value={spouseEmail}
                      onChange={(e) => setSpouseEmail(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="block text-slate-700">Adresse</label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Informations de travail */}
              <div className="border border-slate-200 rounded-lg">
                <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  Informations de travail
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-3 py-3">
                  <div className="space-y-1">
                    <label className="block text-slate-700">Matricule</label>
                    <input
                      value={matricule}
                      onChange={(e) => setMatricule(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">Rôle</label>
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as "ADMIN" | "EMPLOYEE")
                      }
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="EMPLOYEE">Employé</option>
                      <option value="ADMIN">Administrateur</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Points initiaux
                    </label>
                    <input
                      type="number"
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value) || 0)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-700">
                      Mot de passe
                      {editingUserId && (
                        <span className="text-xs text-slate-500 ml-1">
                          (laisser vide pour ne pas modifier)
                        </span>
                      )}
                    </label>
                    <input
                      type="password"
                      required={!editingUserId}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving
                    ? "Enregistrement..."
                    : editingUserId
                    ? "Enregistrer les modifications"
                    : "Ajouter l'utilisateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {deletingUserId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Confirmer la suppression
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700 mb-4">
                Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette
                action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingUserId(null)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(deletingUserId)}
                  disabled={saving}
                  className="px-4 py-2 rounded bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}


