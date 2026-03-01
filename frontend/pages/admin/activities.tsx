import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";
import { getCityImageUrl, fetchCityImageFromUnsplash } from "../../utils/cityImages";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface ActivityTypeOption {
  id: number;
  title: string;
}

interface Excursion {
  id: number;
  title: string;
  city: string;
  hotelName: string;
  hotelCategory: string;
  type: "FAMILY" | "SINGLE" | "COUPLE";
  activityTypeId?: number | null;
  activityType?: ActivityTypeOption | null;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalSeats: number;
  status: "OPEN" | "FULL" | "CLOSED";
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  paymentStartDate?: string | null;
  paymentEndDate?: string | null;
  waitingListPaymentDate?: string | null;
  price?: number | null;
  childPrice?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  agentTypes?: string | null;
  createdAt: string;
}

export default function AdminActivitiesPage() {
  const router = useRouter();
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExcursionId, setEditingExcursionId] = useState<number | null>(
    null
  );
  const [deletingExcursionId, setDeletingExcursionId] = useState<number | null>(
    null
  );
  // Filtres indépendants : type d'activité (prestation) et bénéficiaire
  const [filterPrestation, setFilterPrestation] = useState<string>("");
  const [filterBeneficiary, setFilterBeneficiary] = useState<string>("");
  const hasHandledEditFromQuery = useRef(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [hotelName, setHotelName] = useState("");
  const [hotelCategory, setHotelCategory] = useState("");
  const [type, setType] = useState<"FAMILY" | "SINGLE" | "COUPLE">("FAMILY");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalSeats, setTotalSeats] = useState(10);
  const [status, setStatus] = useState<"OPEN" | "FULL" | "CLOSED">("OPEN");
  const [description, setDescription] = useState("");
  const [registrationStartDate, setRegistrationStartDate] = useState("");
  const [registrationEndDate, setRegistrationEndDate] = useState("");
  const [paymentStartDate, setPaymentStartDate] = useState("");
  const [paymentEndDate, setPaymentEndDate] = useState("");
  const [waitingListPaymentDate, setWaitingListPaymentDate] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [childPrice, setChildPrice] = useState<number | "">("");
  const [agentTypes, setAgentTypes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [activityTypes, setActivityTypes] = useState<ActivityTypeOption[]>([]);
  const [activityTypeId, setActivityTypeId] = useState<number | "">("");

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
        const [resExcursions, resTypes] = await Promise.all([
          fetch(`${API_BASE_URL}/excursions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/admin/activity-types`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!resExcursions.ok) {
          const errBody = await resExcursions.json().catch(() => ({}));
          const msg = errBody?.message || errBody?.error || `HTTP ${resExcursions.status}`;
          throw new Error(`Erreur lors du chargement des activités: ${msg}`);
        }
        const data = await resExcursions.json();
        // Générer automatiquement des images pour les activités qui n'en ont pas
        const excursionsWithImages = data.map((excursion: Excursion) => {
          if (!excursion.imageUrl && excursion.city) {
            const imageUrl = getCityImageUrl(excursion.city);
            return { ...excursion, imageUrl };
          }
          return excursion;
        });
        setExcursions(excursionsWithImages);

        if (resTypes.ok) {
          const types = await resTypes.json();
          // Un seul choix par libellé (éviter les doublons dans le menu)
          const byTitle = new Map<string, { id: number; title: string }>();
          for (const t of types) {
            if (!byTitle.has(t.title)) byTitle.set(t.title, { id: t.id, title: t.title });
          }
          setActivityTypes(Array.from(byTitle.values()));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  // Ouvrir le formulaire d'édition quand on arrive depuis la page détail avec ?edit=id
  useEffect(() => {
    if (!router.isReady || !router.query.edit || hasHandledEditFromQuery.current) return;
    const editId = Number(router.query.edit);
    if (!Number.isInteger(editId) || editId <= 0) return;
    hasHandledEditFromQuery.current = true;
    openEditModal(editId);
    // Nettoyer l'URL sans recharger la page
    router.replace("/admin/activities", undefined, { shallow: true });
  }, [router.isReady, router.query.edit]);

  // Effet pour générer l'image quand la ville change
  useEffect(() => {
    if (city && city.trim() !== "" && !editingExcursionId && !imageUrl) {
      // Ne générer l'image automatiquement que lors de la création si aucune image n'est fournie
      const timeoutId = setTimeout(() => {
        const cityImageUrl = getCityImageUrl(city);
        setImageUrl(cityImageUrl);
      }, 300); // Délai de 300ms pour éviter trop de requêtes

      return () => clearTimeout(timeoutId);
    } else if (city && city.trim() !== "" && editingExcursionId && !imageUrl) {
      // Si on édite et qu'il n'y a pas d'image, en générer une
      const timeoutId = setTimeout(() => {
        const cityImageUrl = getCityImageUrl(city);
        setImageUrl(cityImageUrl);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [city, editingExcursionId, imageUrl]);

  function resetForm() {
    setTitle("");
    setCity("");
    setHotelName("");
    setHotelCategory("");
    setType("FAMILY");
    setStartDate("");
    setEndDate("");
    setTotalSeats(10);
    setStatus("OPEN");
    setDescription("");
    setRegistrationStartDate("");
    setRegistrationEndDate("");
    setPaymentStartDate("");
    setPaymentEndDate("");
    setWaitingListPaymentDate("");
    setPrice("");
    setChildPrice("");
    setAgentTypes("");
    setImageUrl("");
    setActivityTypeId("");
    setEditingExcursionId(null);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  async function openEditModal(excursionId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/excursions/${excursionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Erreur lors du chargement de l'activité");
      }
      const excursion = await res.json();
      setEditingExcursionId(excursionId);
      setTitle(excursion.title);
      setCity(excursion.city);
      setHotelName(excursion.hotelName);
      setHotelCategory(excursion.hotelCategory);
      setType(excursion.type);
      setActivityTypeId(excursion.activityTypeId ?? "");
      setStartDate(excursion.startDate.split("T")[0]);
      setEndDate(excursion.endDate.split("T")[0]);
      setTotalSeats(excursion.totalSeats);
      setStatus(excursion.status);
      setDescription(excursion.description || "");
      setRegistrationStartDate(
        excursion.registrationStartDate
          ? excursion.registrationStartDate.split("T")[0]
          : ""
      );
      setRegistrationEndDate(
        excursion.registrationEndDate
          ? excursion.registrationEndDate.split("T")[0]
          : ""
      );
      setPaymentStartDate(
        excursion.paymentStartDate ? excursion.paymentStartDate.split("T")[0] : ""
      );
      setPaymentEndDate(
        excursion.paymentEndDate ? excursion.paymentEndDate.split("T")[0] : ""
      );
      setWaitingListPaymentDate(
        excursion.waitingListPaymentDate
          ? excursion.waitingListPaymentDate.split("T")[0]
          : ""
      );
      setPrice(excursion.price || "");
      setChildPrice(excursion.childPrice || "");
      setAgentTypes(excursion.agentTypes || "");
      setImageUrl(excursion.imageUrl || "");
      setIsModalOpen(true);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement de l'activité");
    }
  }

  async function handleSubmitExcursion(e: React.FormEvent) {
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
      const sd = new Date(startDate);
      const ed = new Date(endDate);
      const diffMs = ed.getTime() - sd.getTime();
      const durationDays = Math.max(
        1,
        Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1
      );

      const url = editingExcursionId
        ? `${API_BASE_URL}/excursions/${editingExcursionId}`
        : `${API_BASE_URL}/excursions`;
      const method = editingExcursionId ? "PUT" : "POST";

      // Validation : lister tous les champs manquants pour un seul message
      const missing: string[] = [];
      if (!title || !title.trim()) missing.push("Titre");
      if (!city || !city.trim()) missing.push("Direction (ville)");
      if (!hotelName || !hotelName.trim()) missing.push("Nom de l'hôtel");
      if (!startDate) missing.push("Date de début d'activité");
      if (!endDate) missing.push("Date de fin d'activité");
      if (!totalSeats || Number(totalSeats) <= 0) missing.push("Nombre de places (supérieur à 0)");
      if (missing.length > 0) {
        alert("⚠️ Champs obligatoires manquants ou invalides :\n\n" + missing.join("\n") + "\n\nVeuillez les remplir pour enregistrer.");
        setSaving(false);
        return;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        alert("⚠️ La date de fin doit être après la date de début.");
        setSaving(false);
        return;
      }

      if (!activityTypeId) {
        const proceed = window.confirm(
          "Type d'activité (prestation) non renseigné.\n\nSans type d'activité, les points ne seront pas crédités aux participants à la clôture de la sélection.\n\nVoulez-vous quand même enregistrer ?"
        );
        if (!proceed) {
          setSaving(false);
          return;
        }
      }
      
      // Générer automatiquement l'image si elle n'est pas fournie
      let finalImageUrl = imageUrl;
      if (!finalImageUrl && city) {
        finalImageUrl = getCityImageUrl(city);
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          city,
          hotelName,
          hotelCategory: hotelCategory || "",
          type,
          activityTypeId: activityTypeId || null,
          startDate,
          endDate,
          durationDays,
          totalSeats: Number(totalSeats),
          status,
          registrationStartDate: registrationStartDate || null,
          registrationEndDate: registrationEndDate || null,
          paymentStartDate: paymentStartDate || null,
          paymentEndDate: paymentEndDate || null,
          waitingListPaymentDate: waitingListPaymentDate || null,
          price: price !== "" && price !== null ? Number(price) : null,
          childPrice: childPrice !== "" && childPrice !== null ? Number(childPrice) : null,
          description: description || null,
          imageUrl: finalImageUrl || null,
          agentTypes: agentTypes || null,
          days: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            (editingExcursionId
              ? "Erreur lors de la modification de l'activité"
              : "Erreur lors de la création de l'activité")
        );
      }

      const updated = await res.json();
      
      // Recharger la liste complète pour s'assurer d'avoir les données à jour
      const reloadRes = await fetch(`${API_BASE_URL}/excursions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (reloadRes.ok) {
        const data = await reloadRes.json();
        const excursionsWithImages = data.map((excursion: Excursion) => {
          if (!excursion.imageUrl && excursion.city) {
            const imageUrl = getCityImageUrl(excursion.city);
            return { ...excursion, imageUrl };
          }
          return excursion;
        });
        setExcursions(excursionsWithImages);
      } else {
        // Fallback: mettre à jour localement
        if (editingExcursionId) {
          setExcursions((prev) =>
            prev.map((e) => (e.id === editingExcursionId ? updated : e))
          );
        } else {
          setExcursions((prev) => [...prev, updated]);
        }
      }

      resetForm();
      setIsModalOpen(false);
    } catch (e: any) {
      setError(
        e.message ||
          (editingExcursionId
            ? "Erreur lors de la modification de l'activité"
            : "Erreur lors de la création de l'activité")
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExcursion(excursionId: number) {
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
      const res = await fetch(`${API_BASE_URL}/excursions/${excursionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message || "Erreur lors de la suppression de l'activité"
        );
      }

      setExcursions((prev) => prev.filter((e) => e.id !== excursionId));
      setDeletingExcursionId(null);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la suppression de l'activité");
    } finally {
      setSaving(false);
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "OPEN":
        return "Ouverte";
      case "FULL":
        return "Fin d'inscription";
      case "CLOSED":
        return "Closed";
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
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  }

  function getBeneficiaryLabel(type: string) {
    const map: Record<string, string> = {
      FAMILY: "Famille",
      SINGLE: "Single",
      COUPLE: "Couple",
    };
    return map[type] || type;
  }

  function getFilteredExcursions() {
    return excursions.filter((e) => {
      const matchPrestation = !filterPrestation || e.activityType?.title === filterPrestation;
      const matchBeneficiary = !filterBeneficiary || e.type === filterBeneficiary;
      return matchPrestation && matchBeneficiary;
    });
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          Chargement des activités…
        </div>
      </AdminLayout>
    );
  }

  const filteredExcursions = getFilteredExcursions();

  return (
    <AdminLayout>
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-200 bg-white shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Les activités
        </h1>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          Ajouter une activité
        </button>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Filtres : type d'activité (prestation) et bénéficiaire */}
        <div className="flex flex-wrap items-center gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Type d&apos;activité :</span>
            <select
              value={filterPrestation}
              onChange={(e) => setFilterPrestation(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tous (Excursion / Escapade / Diner…)</option>
              {activityTypes.map((at) => (
                <option key={at.id} value={at.title}>
                  {at.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Bénéficiaire :</span>
            <select
              value={filterBeneficiary}
              onChange={(e) => setFilterBeneficiary(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tous</option>
              <option value="SINGLE">Single</option>
              <option value="COUPLE">Couple</option>
              <option value="FAMILY">Famille</option>
            </select>
          </div>
          {(filterPrestation || filterBeneficiary) && (
            <button
              type="button"
              onClick={() => {
                setFilterPrestation("");
                setFilterBeneficiary("");
              }}
              className="text-sm text-slate-500 hover:text-slate-700 underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Grille de cartes */}
        {filteredExcursions.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-8">
            Aucune activité pour le moment.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredExcursions.map((excursion) => (
              <div
                key={excursion.id}
                onClick={() => router.push(`/admin/activities/${excursion.id}`)}
                className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Image */}
                <div className="relative h-40 bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden">
                  <img
                    src={excursion.imageUrl || getCityImageUrl(excursion.city)}
                    alt={excursion.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Si l'image ne charge pas, essayer avec l'URL de la ville
                      const fallbackUrl = getCityImageUrl(excursion.city);
                      const imgElement = e.target as HTMLImageElement;
                      if (imgElement.src !== fallbackUrl) {
                        imgElement.src = fallbackUrl;
                      } else {
                        // Si même le fallback ne charge pas, masquer l'image
                        imgElement.style.display = "none";
                      }
                    }}
                  />
                  <span
                    className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(
                      excursion.status
                    )}`}
                  >
                    {getStatusLabel(excursion.status)}
                  </span>
                </div>

                {/* Contenu */}
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {excursion.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    {excursion.description || "lorem"}
                  </p>

                  <div className="space-y-1 text-xs text-slate-600 mb-3">
                    <div>
                      <span className="font-medium">Prestation:</span>{" "}
                      {excursion.activityType?.title ?? "—"}
                    </div>
                    <div>
                      <span className="font-medium">Bénéficiaire:</span>{" "}
                      {getBeneficiaryLabel(excursion.type)}
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
                      {new Date(excursion.startDate).toLocaleDateString("fr-FR")}
                    </div>
                    <div>
                      <span className="font-medium">Date de fin:</span>{" "}
                      {new Date(excursion.endDate).toLocaleDateString("fr-FR")}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/activities/selection/${excursion.id}`);
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700"
                    >
                      selection
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(excursion.id);
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-orange-500 text-white text-xs font-medium hover:bg-orange-600"
                    >
                      edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingExcursionId(excursion.id);
                      }}
                      className="flex-1 px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                    >
                      delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modale de création/modification */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingExcursionId
                  ? "Modifier l'activité"
                  : "Ajouter une activité"}
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
            <form onSubmit={handleSubmitExcursion} className="px-5 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="block text-slate-700">Titre</label>
                  <input
                    required
                    placeholder="Titre de type"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Type d&apos;activité (prestation)</label>
                  <select
                    value={activityTypeId === "" ? "" : activityTypeId}
                    onChange={(e) =>
                      setActivityTypeId(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner un type (Excursion, Diner, Escapade…)</option>
                    {activityTypes.map((at) => (
                      <option key={at.id} value={at.id}>
                        {at.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Bénéficiaire</label>
                  <select
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as "FAMILY" | "SINGLE" | "COUPLE")
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="FAMILY">Famille</option>
                    <option value="SINGLE">Single</option>
                    <option value="COUPLE">Couple</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Numéro de participants
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    placeholder="Titre de type"
                    value={totalSeats}
                    onChange={(e) => setTotalSeats(Number(e.target.value) || 1)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Direction</label>
                  <input
                    required
                    placeholder="Direction"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      // Charger l'image automatiquement
                      const cityImageUrl = getCityImageUrl(e.target.value);
                      setImageUrl(cityImageUrl);
                    }}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {imageUrl && (
                    <div className="mt-2">
                      <img
                        src={imageUrl}
                        alt={city}
                        className="w-full h-32 object-cover rounded border border-slate-200"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Début d'activité
                  </label>
                  <input
                    type="date"
                    required
                    placeholder="jj/mm/aaaa"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Fin d'activité</label>
                  <input
                    type="date"
                    required
                    placeholder="jj/mm/aaaa"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Début d'inscription
                  </label>
                  <input
                    type="date"
                    placeholder="jj/mm/aaaa"
                    value={registrationStartDate}
                    onChange={(e) => setRegistrationStartDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Fin d'inscription
                  </label>
                  <input
                    type="date"
                    placeholder="jj/mm/aaaa"
                    value={registrationEndDate}
                    onChange={(e) => setRegistrationEndDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Début paiement
                  </label>
                  <input
                    type="date"
                    placeholder="jj/mm/aaaa"
                    value={paymentStartDate}
                    onChange={(e) => setPaymentStartDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Fin paiement</label>
                  <input
                    type="date"
                    placeholder="jj/mm/aaaa"
                    value={paymentEndDate}
                    onChange={(e) => setPaymentEndDate(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Date paiement liste d'attente
                  </label>
                  <input
                    type="date"
                    placeholder="jj/mm/aaaa"
                    value={waitingListPaymentDate}
                    onChange={(e) =>
                      setWaitingListPaymentDate(e.target.value)
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Hébergement</label>
                  <input
                    required
                    placeholder="Direction"
                    value={hotelName}
                    onChange={(e) => setHotelName(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Catégorie hôtel (étoiles)
                  </label>
                  <input
                    placeholder="Ex: 4*"
                    value={hotelCategory}
                    onChange={(e) => setHotelCategory(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">
                    Types d'agent
                  </label>
                  <select
                    value={agentTypes}
                    onChange={(e) => setAgentTypes(e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select value</option>
                    <option value="EMPLOYEE">Employé</option>
                    <option value="MANAGER">Manager</option>
                    <option value="DIRECTOR">Directeur</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Prix</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Prix"
                    value={price}
                    onChange={(e) =>
                      setPrice(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-slate-700">Tarif enfant</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    placeholder="Tarif en enfant"
                    value={childPrice}
                    onChange={(e) =>
                      setChildPrice(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-slate-700">Description</label>
                  <textarea
                    placeholder="Description de l'activité"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-slate-700">Image</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="px-3 py-1 rounded border border-slate-300 text-slate-700 text-sm cursor-pointer hover:bg-slate-50"
                    >
                      Choisir un fichier
                    </label>
                    <span className="text-xs text-slate-500">
                      {imageUrl ? "Fichier choisi" : "Aucun fichier choisi"}
                    </span>
                  </div>
                  {imageUrl && (
                    <div className="mt-2">
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded border border-slate-200"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
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
                    : editingExcursionId
                    ? "Enregistrer les modifications"
                    : "Ajouter l'activité"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {deletingExcursionId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Confirmer la suppression
              </h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-700 mb-4">
                Êtes-vous sûr de vouloir supprimer cette activité ? Cette
                action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingExcursionId(null)}
                  className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteExcursion(deletingExcursionId)}
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
