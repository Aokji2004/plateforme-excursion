import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";
import { API_BASE_URL } from "../../utils/config";

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  matricule?: string;
  maritalStatus?: "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED";
  spouse?: string;
  spouseEmail?: string;
}

interface Child {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE";
}

interface UserWithFamily extends User {
  children: Child[];
}

export default function FamilyStatusPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserWithFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    maritalStatus: "" as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "",
    spouse: "",
    spouseEmail: "",
  });

  // Récupérer tous les utilisateurs avec leurs enfants
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des utilisateurs");
      }

      const data = await response.json();
      const usersWithChildren = await Promise.all(
        data.map(async (user: User) => {
          try {
            const childRes = await fetch(
              `${API_BASE_URL}/admin/children/user/${user.id}/children`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            const children = childRes.ok ? await childRes.json() : [];
            return {
              ...user,
              children: Array.isArray(children) ? children : [],
            };
          } catch {
            return {
              ...user,
              children: [],
            };
          }
        })
      );

      setUsers(usersWithChildren);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEditClick = (user: UserWithFamily) => {
    setEditingUserId(user.id);
    setEditForm({
      maritalStatus: user.maritalStatus || "",
      spouse: user.spouse || "",
      spouseEmail: user.spouseEmail || "",
    });
  };

  const handleSaveEdit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!editingUserId) {
      alert("Aucun utilisateur en cours de modification. Cliquez sur « Modifier » pour éditer.");
      return;
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`${API_BASE_URL}/admin/users/${editingUserId}/family-status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maritalStatus: editForm.maritalStatus || null,
          spouse: (editForm.maritalStatus === "MARRIED" || editForm.maritalStatus === "WIDOWED")
            ? ((editForm.spouse || "").trim() || null)
            : null,
          spouseEmail: (editForm.maritalStatus === "MARRIED" || editForm.maritalStatus === "WIDOWED")
            ? ((editForm.spouseEmail || "").trim() || null)
            : null,
        }),
      });

      let errorMessage = "Erreur lors de la sauvegarde";
      if (!response.ok) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Erreur ${response.status}`;
        } catch {
          errorMessage = `Erreur serveur (${response.status}). Vérifiez que le backend est démarré.`;
        }
        throw new Error(errorMessage);
      }

      setEditingUserId(null);
      await fetchUsers();
      alert("Situation familiale enregistrée.");
    } catch (err) {
      console.error("Error saving:", err);
      alert(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(searchInput.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchInput.toLowerCase())) ||
      (user.matricule && user.matricule.toLowerCase().includes(searchInput.toLowerCase()))
  );

  const maritalStatusLabels = {
    SINGLE: "Célibataire",
    MARRIED: "Marié(e)",
    DIVORCED: "Divorcé(e)",
    WIDOWED: "Veuf(ve)",
  };

  const genderLabels = {
    MALE: "Garçon",
    FEMALE: "Fille",
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Situation Familiale
          </h1>
          <p className="text-gray-600">
            Gestion de la situation familiale et des enfants des employés
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Barre de recherche */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Rechercher par nom, email ou matricule..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Chargement...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-lg shadow border border-gray-200 p-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Informations utilisateur */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {user.firstName} {user.lastName}
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <span className="font-medium">Email:</span> {user.email}
                      </p>
                      {user.matricule && (
                        <p>
                          <span className="font-medium">Matricule:</span>{" "}
                          {user.matricule}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Situation familiale */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Situation familiale
                    </h4>
                    {editingUserId === user.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Statut
                          </label>
                          <select
                            value={editForm.maritalStatus}
                            onChange={(e) => {
                              const newStatus = e.target.value as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED" | "";
                              const canHaveSpouse = newStatus === "MARRIED" || newStatus === "WIDOWED";
                              setEditForm({
                                ...editForm,
                                maritalStatus: newStatus,
                                spouse: canHaveSpouse ? editForm.spouse : "",
                                spouseEmail: canHaveSpouse ? editForm.spouseEmail : "",
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">Non spécifié</option>
                            <option value="SINGLE">Célibataire</option>
                            <option value="MARRIED">Marié(e)</option>
                            <option value="DIVORCED">Divorcé(e)</option>
                            <option value="WIDOWED">Veuf(ve)</option>
                          </select>
                        </div>
                        {(editForm.maritalStatus === "MARRIED" || editForm.maritalStatus === "WIDOWED") && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nom du conjoint
                              </label>
                              <input
                                type="text"
                                value={editForm.spouse}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    spouse: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Nom du conjoint"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email du conjoint
                              </label>
                              <input
                                type="email"
                                value={editForm.spouseEmail}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    spouseEmail: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="Email du conjoint"
                              />
                            </div>
                          </>
                        )}
                        <div className="flex gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setEditingUserId(null)}
                            className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSaveEdit(e)}
                            disabled={saving}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-50"
                          >
                            {saving ? "Sauvegarde..." : "Enregistrer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2 mb-3">
                          {user.maritalStatus ? (
                            <>
                              <p className="text-sm text-gray-700">
                                <span className="font-medium">Statut:</span>{" "}
                                {maritalStatusLabels[user.maritalStatus]}
                              </p>
                              {(user.maritalStatus === "MARRIED" || user.maritalStatus === "WIDOWED") && (
                                <>
                                  {user.spouse && (
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">Conjoint:</span> {user.spouse}
                                    </p>
                                  )}
                                  {user.spouseEmail && (
                                    <p className="text-sm text-gray-700">
                                      <span className="font-medium">Email conjoint:</span> {user.spouseEmail}
                                    </p>
                                  )}
                                </>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-gray-500">
                              Non renseigné
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleEditClick(user)}
                          className="w-full px-3 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium"
                        >
                          Modifier
                        </button>
                      </>
                    )}
                  </div>

                  {/* Enfants */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Enfants ({user.children.length})
                    </h4>
                    {user.children.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun enfant</p>
                    ) : (
                      <div className="space-y-2">
                        {user.children.map((child) => (
                          <div
                            key={child.id}
                            className="p-2 bg-gray-50 rounded border border-gray-200"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {child.firstName} {child.lastName}{" "}
                              {child.gender === "MALE" ? "♂" : "♀"}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(
                                child.dateOfBirth
                              ).toLocaleDateString("fr-FR")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        router.push(
                          `/admin/children?userId=${user.id}`
                        );
                      }}
                      className="w-full mt-3 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                    >
                      Gérer les enfants
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">Aucun utilisateur trouvé</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
