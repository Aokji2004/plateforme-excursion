import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";

import { API_BASE_URL } from "../../utils/config";

interface ActivityType {
  id: number;
  title: string;
  beneficiary: "FAMILY" | "SINGLE" | "COUPLE";
  points: number;
  pointsPerChild: number;
  pointsConjoint: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminActivityTypesPage() {
  const router = useRouter();
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newTypeValue, setNewTypeValue] = useState("");

  // Liste des types pour le menu : uniques, sans répétition
  const typeOptions = Array.from(new Set(activityTypes.map((t) => t.title)));

  const [formData, setFormData] = useState({
    id: 0,
    title: "",
    beneficiary: "FAMILY" as "FAMILY" | "SINGLE" | "COUPLE",
    points: 0,
    pointsPerChild: 0,
    pointsConjoint: 0,
  });

  // Récupérer les types d'activités
  const fetchActivityTypes = async () => {
    try {
      setLoading(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
      
      if (!token) {
        console.warn("No token found, redirecting to login");
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/activity-types`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setActivityTypes(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching activity types:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch activity types"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityTypes();
  }, []);

  // Ouvrir modal pour créer
  const handleAddNew = () => {
    setFormData({
      id: 0,
      title: "",
      beneficiary: "FAMILY",
      points: 0,
      pointsPerChild: 0,
      pointsConjoint: 0,
    });
    setIsAddingNewType(false);
    setNewTypeValue("");
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  // Ouvrir modal pour modifier
  const handleEdit = (activityType: ActivityType) => {
    setFormData({
      id: activityType.id,
      title: activityType.title,
      beneficiary: activityType.beneficiary,
      points: activityType.points,
      pointsPerChild: activityType.pointsPerChild,
      pointsConjoint: activityType.pointsConjoint,
    });
    setIsAddingNewType(false);
    setNewTypeValue("");
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Sauvegarder (créer ou mettre à jour)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing: string[] = [];
    if (!formData.title || !String(formData.title).trim()) missing.push("Type (titre)");
    if (!formData.beneficiary) missing.push("Bénéficiaire (Single / Couple / Famille)");
    if (formData.points < 0) missing.push("Points Agent (doit être ≥ 0)");
    if (formData.beneficiary === "COUPLE" && (formData.pointsConjoint ?? 0) < 0) missing.push("Points Conjoint (doit être ≥ 0)");
    if (formData.beneficiary === "FAMILY") {
      if ((formData.pointsPerChild ?? 0) < 0) missing.push("Points par Enfant (doit être ≥ 0)");
      if ((formData.pointsConjoint ?? 0) < 0) missing.push("Points Conjoint (doit être ≥ 0)");
    }
    if (missing.length > 0) {
      alert("⚠️ Champs manquants ou invalides :\n\n" + missing.join("\n") + "\n\nVeuillez corriger pour enregistrer.");
      return;
    }

    const pointsConjoint = formData.beneficiary === "SINGLE" ? 0 : (formData.pointsConjoint ?? 0);
    const pointsPerChild = formData.beneficiary !== "FAMILY" ? 0 : (formData.pointsPerChild ?? 0);

    try {
      setSaving(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
      
      if (!token) {
        alert("Token manquant. Veuillez vous reconnecter.");
        router.replace("/login");
        return;
      }
      const method = isEditMode ? "PUT" : "POST";
      const url = isEditMode
        ? `${API_BASE_URL}/admin/activity-types/${formData.id}`
        : `${API_BASE_URL}/admin/activity-types`;

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          beneficiary: formData.beneficiary,
          points: parseInt(formData.points as any),
          pointsPerChild,
          pointsConjoint,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      // Rafraîchir la liste
      await fetchActivityTypes();
      setIsModalOpen(false);
      setFormData({
        id: 0,
        title: "",
        beneficiary: "FAMILY",
        points: 0,
        pointsPerChild: 0,
        pointsConjoint: 0,
      });
    } catch (err) {
      console.error("Error saving activity type:", err);
      alert(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde"
      );
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un type d'activité
  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce type d'activité?")) {
      return;
    }

    try {
      setDeletingId(id);
      const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
      
      if (!token) {
        alert("Token manquant. Veuillez vous reconnecter.");
        router.replace("/login");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/admin/activity-types/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      await fetchActivityTypes();
    } catch (err) {
      console.error("Error deleting activity type:", err);
      alert(
        err instanceof Error ? err.message : "Erreur lors de la suppression"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Types d'Activités
          </h1>
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Ajouter Type
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="text-gray-500">Chargement...</div>
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full">
              <thead className="bg-[#176139] text-white border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Prestation
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Bénéficiaire
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Conjoint
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">
                    Enfant
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activityTypes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Aucun type d'activité trouvé
                    </td>
                  </tr>
                ) : (
                  activityTypes.map((activityType) => (
                    <tr
                      key={activityType.id}
                      className="hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activityType.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activityType.beneficiary === "FAMILY"
                          ? "Famille"
                          : activityType.beneficiary === "SINGLE"
                          ? "Single"
                          : "Couple"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activityType.points}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activityType.pointsConjoint}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {activityType.pointsPerChild}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(activityType)}
                            className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition text-sm font-medium"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDelete(activityType.id)}
                            disabled={deletingId === activityType.id}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition text-sm font-medium disabled:opacity-50"
                          >
                            {deletingId === activityType.id
                              ? "Suppression..."
                              : "Supprimer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-[1px]">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                {isEditMode ? "Modifier le Type d'Activité" : "Ajouter un Type d'Activité"}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  {!isAddingNewType ? (
                    <div className="space-y-2">
                      <select
                        value={formData.title}
                        onChange={(e) => {
                          if (e.target.value === "__new__") {
                            setIsAddingNewType(true);
                            setNewTypeValue("");
                          } else {
                            setFormData({ ...formData, title: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner un type</option>
                        {typeOptions.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                        <option value="__new__">+ Ajouter un nouveau type</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newTypeValue}
                        onChange={(e) => setNewTypeValue(e.target.value)}
                        onBlur={() => {
                          if (newTypeValue.trim()) {
                            setFormData({ ...formData, title: newTypeValue.trim() });
                            setIsAddingNewType(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (newTypeValue.trim()) {
                              setFormData({ ...formData, title: newTypeValue.trim() });
                              setIsAddingNewType(false);
                            }
                          } else if (e.key === "Escape") {
                            setIsAddingNewType(false);
                            setNewTypeValue("");
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Entrer le nom du type"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewType(false);
                          setNewTypeValue("");
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900"
                      >
                        Retour
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bénéficiaire (type d&apos;activité)
                  </label>
                  <select
                    value={formData.beneficiary}
                    onChange={(e) => {
                      const v = e.target.value as "FAMILY" | "SINGLE" | "COUPLE";
                      setFormData({
                        ...formData,
                        beneficiary: v,
                        ...(v === "SINGLE" && { pointsConjoint: 0, pointsPerChild: 0 }),
                        ...(v === "COUPLE" && { pointsPerChild: 0 }),
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SINGLE">Single (agent uniquement)</option>
                    <option value="COUPLE">Couple (agent + conjoint)</option>
                    <option value="FAMILY">Famille (agent + conjoint + enfant)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.beneficiary === "SINGLE" && "Vous pourrez saisir les points Agent uniquement."}
                    {formData.beneficiary === "COUPLE" && "Vous pourrez saisir les points Agent et Conjoint."}
                    {formData.beneficiary === "FAMILY" && "Vous pourrez saisir les points Agent, Conjoint et Enfant."}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points Agent
                  </label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        points: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    min="0"
                  />
                </div>

                {(formData.beneficiary === "COUPLE" || formData.beneficiary === "FAMILY") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points Conjoint
                    </label>
                    <input
                      type="number"
                      value={formData.pointsConjoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pointsConjoint: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}

                {formData.beneficiary === "FAMILY" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Points par Enfant
                    </label>
                    <input
                      type="number"
                      value={formData.pointsPerChild}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pointsPerChild: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
