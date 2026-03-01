import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../../components/AdminLayout";
import { getCityImageUrl } from "../../../utils/cityImages";
import {
  exportCopy,
  exportCSV,
  exportExcel,
  exportPDF,
  printTable,
  type ExportColumn,
} from "../../../utils/exportTable";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

interface Excursion {
  id: number;
  title: string;
  city: string;
  hotelName: string;
  hotelCategory: string;
  type: "FAMILY" | "SINGLE" | "COUPLE";
  activityTypeId?: number | null;
  activityType?: { id: number; title: string } | null;
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
}

interface Application {
  id: number;
  userId: number;
  excursionId: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING_LIST";
  inscriptionStatus?: "INSCRIT" | "SELECTIONNE" | "ATTENTE" | "FINAL" | "REFUSE";
  originalInscriptionStatus?: "INSCRIT" | "SELECTIONNE" | "ATTENTE" | "FINAL" | "REFUSE";
  computedScore?: number | null;
  selectionOrder?: number | null;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    matricule: string | null;
    points: number;
  };
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  matricule: string;
}

type TabType =
  | "details"
  | "inscriptions"
  | "selectionnes"
  | "attente"
  | "finale"
  | "recapitulatif";

export default function ActivityDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [excursion, setExcursion] = useState<Excursion | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchUserInput, setSearchUserInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchApplicationInput, setSearchApplicationInput] = useState("");
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [columnVisibility, setColumnVisibility] = useState({
    rang: true,
    matricule: true,
    nom: true,
    prenom: true,
    email: true,
    points: true,
    score: true,
    date: true,
  });
  const [exportColumnVisibilityOpen, setExportColumnVisibilityOpen] = useState(false);

  // Auto-refresh des données toutes les 2 secondes pendant 30 secondes après sélection
  const startAutoRefresh = useCallback(async (token: string) => {
    setIsAutoRefreshing(true);
    let refreshCount = 0;
    const maxRefreshes = 15; // 30 secondes

    const autoRefresh = async () => {
      try {
        refreshCount++;
        
        // Recharger les applications
        const resApplications = await fetch(
          `${API_BASE_URL}/excursions/${id}/applications?t=${Date.now()}&r=${Math.random()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
            },
          }
        );
        
        if (resApplications.ok) {
          const applicationsData = await resApplications.json();
          setApplications(JSON.parse(JSON.stringify(applicationsData)));
          console.log(`🔄 Auto-refresh ${refreshCount}: ${applicationsData.length} applications`);
        }

        // Arrêter après max refreshes
        if (refreshCount >= maxRefreshes) {
          stopAutoRefresh();
        }
      } catch (e) {
        console.error("Erreur auto-refresh:", e);
      }
    };

    autoRefreshIntervalRef.current = setInterval(autoRefresh, 2000);
  }, [id]);

  const stopAutoRefresh = useCallback(() => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
    setIsAutoRefreshing(false);
    console.log("✅ Auto-refresh arrêté");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, []);
  const [isPaymentConfirmationModalOpen, setIsPaymentConfirmationModalOpen] = useState(false);
  const [paymentSearchInput, setPaymentSearchInput] = useState("");
  const [selectedApplicationsForPayment, setSelectedApplicationsForPayment] = useState<number[]>([]);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionMaxPlaces, setSelectionMaxPlaces] = useState("");
  const [selectionSortCriteria, setSelectionSortCriteria] = useState("");
  const [selectionSortBy, setSelectionSortBy] = useState("points");
  const [inscritCount, setInscritCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [waitingListCount, setWaitingListCount] = useState(0);
  const [finalCount, setFinalCount] = useState(0);
  const [refusedCount, setRefusedCount] = useState(0);
  const [currentMaxPlaces, setCurrentMaxPlaces] = useState<number | null>(null);
  const [isRemoveFromFinalModalOpen, setIsRemoveFromFinalModalOpen] = useState(false);
  const [removeFromFinalSearchInput, setRemoveFromFinalSearchInput] = useState("");
  const [isPromoteReplaceModalOpen, setIsPromoteReplaceModalOpen] = useState(false);
  const [replaceApplicationIdForPromote, setReplaceApplicationIdForPromote] = useState<number | null>(null);

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

    if (!id || typeof id !== "string") return;

    async function load() {
      try {
        // Charger l'excursion avec cache-busting
        const resExcursion = await fetch(`${API_BASE_URL}/excursions/${id}?t=${Date.now()}&nocache=${Math.random()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
        });
        if (!resExcursion.ok) {
          throw new Error("Erreur lors du chargement de l'activité");
        }
        const excursionData = await resExcursion.json();
        // Si l'excursion n'a pas d'image, en générer une basée sur la ville
        if (!excursionData.imageUrl && excursionData.city) {
          excursionData.imageUrl = getCityImageUrl(excursionData.city);
        }
        setExcursion(excursionData);
        // Récupérer la limite max de places si elle existe
        if (excursionData.selectionMaxPlaces) {
          setCurrentMaxPlaces(excursionData.selectionMaxPlaces);
        }

        // Charger les applications avec cache-busting
        const resApplications = await fetch(
          `${API_BASE_URL}/excursions/${id}/applications?t=${Date.now()}&nocache=${Math.random()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache, no-store, must-revalidate"
            },
          }
        );
        if (resApplications.ok) {
          const applicationsData = await resApplications.json();
          // Force React re-render
          setApplications(JSON.parse(JSON.stringify(applicationsData)));
        }

        // Charger les utilisateurs pour le modal
        const resUsers = await fetch(`${API_BASE_URL}/admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (resUsers.ok) {
          const usersData = await resUsers.json();
          setUsers(usersData);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  // Calculer les comptages
  useEffect(() => {
    setInscritCount(applications.filter((app) => app.originalInscriptionStatus === "INSCRIT" || app.status === "PENDING").length);
    setApprovedCount(applications.filter((app) => app.inscriptionStatus === "SELECTIONNE" || app.inscriptionStatus === "FINAL").length);
    setWaitingListCount(applications.filter((app) => app.inscriptionStatus === "ATTENTE").length);
    setFinalCount(applications.filter((app) => app.inscriptionStatus === "FINAL").length);
    setRefusedCount(applications.filter((app) => app.inscriptionStatus === "REFUSE").length);
  }, [applications]);

  function getTypeLabel(type: string) {
    const typeMap: Record<string, string> = {
      FAMILY: "Excursion Famille",
      SINGLE: "Excursion Single",
      COUPLE: "Excursion Couple",
    };
    return typeMap[type] || type;
  }

  function formatDate(dateString: string | null | undefined) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR");
  }

  function formatDateForExport(dateString: string) {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR");
  }

  function getExportRowsAndColumns() {
    const list = getFilteredApplications();
    const showRang = activeTab === "selectionnes";
    const baseColumns: ExportColumn[] = [
      ...(showRang ? [{ key: "rang", label: "Rang", visible: columnVisibility.rang }] : []),
      { key: "matricule", label: "Matricule", visible: columnVisibility.matricule },
      { key: "nom", label: "Nom", visible: columnVisibility.nom },
      { key: "prenom", label: "Prénom", visible: columnVisibility.prenom },
      { key: "email", label: "Email", visible: columnVisibility.email },
      { key: "points", label: "Points", visible: columnVisibility.points },
      { key: "score", label: "Score", visible: columnVisibility.score },
      { key: "date", label: "Date inscription", visible: columnVisibility.date },
    ].filter(Boolean) as ExportColumn[];

    const rows: Record<string, string>[] = list.map((app) => ({
      ...(showRang ? { rang: String(app.selectionOrder ?? "-") } : {}),
      matricule: app.user.matricule ?? "-",
      nom: app.user.lastName,
      prenom: app.user.firstName,
      email: app.user.email ?? "-",
      points: String(app.user.points ?? "-"),
      score: app.computedScore != null ? app.computedScore.toFixed(2) : "-",
      date: formatDateForExport(app.createdAt),
    }));

    return { rows, columns: baseColumns };
  }

  function getExportTitle() {
    const t =
      activeTab === "inscriptions"
        ? "Inscriptions"
        : activeTab === "selectionnes"
        ? "Sélectionnés"
        : activeTab === "attente"
        ? "Liste d'attente"
        : activeTab === "finale"
        ? "Liste finale"
        : "Liste";
    return excursion ? `${excursion.title} - ${t}` : t;
  }

  function handleExportCopy() {
    const { rows, columns } = getExportRowsAndColumns();
    exportCopy(rows, columns);
  }
  function handleExportCSV() {
    const { rows, columns } = getExportRowsAndColumns();
    exportCSV(rows, columns, getExportTitle().replace(/\s+/g, "_"));
  }
  function handleExportExcel() {
    const { rows, columns } = getExportRowsAndColumns();
    exportExcel(rows, columns, getExportTitle().replace(/\s+/g, "_"));
  }
  function handleExportPDF() {
    const { rows, columns } = getExportRowsAndColumns();
    exportPDF(rows, columns, getExportTitle(), getExportTitle().replace(/\s+/g, "_"));
  }
  function handleExportPrint() {
    const { rows, columns } = getExportRowsAndColumns();
    printTable(rows, columns, getExportTitle());
  }

  function getFilteredApplications() {
    switch (activeTab) {
      case "inscriptions":
        // Afficher tous les participants qui ont été inscrits au départ
        // en utilisant le champ originalInscriptionStatus qui ne change pas
        return applications
          .filter((app) => {
            // Afficher si originalInscriptionStatus est "INSCRIT"
            // ou si inscriptionStatus n'existe pas ou est "INSCRIT"
            return (app.originalInscriptionStatus === "INSCRIT") || 
                   (!app.inscriptionStatus || app.inscriptionStatus === "INSCRIT") || 
                   (app.status === "PENDING" && !app.inscriptionStatus);
          })
          .filter((app) => 
            searchApplicationInput.trim() === "" ||
            `${app.user.firstName} ${app.user.lastName}`
              .toLowerCase()
              .includes(searchApplicationInput.toLowerCase()) ||
            (app.user.email && app.user.email.toLowerCase().includes(searchApplicationInput.toLowerCase())) ||
            (app.user.matricule && app.user.matricule.toLowerCase().includes(searchApplicationInput.toLowerCase()))
          );
      case "selectionnes":
        return applications
          .filter((app) => app.inscriptionStatus === "SELECTIONNE" || app.inscriptionStatus === "FINAL")
          .sort((a, b) => (a.selectionOrder || 0) - (b.selectionOrder || 0))
          .filter((app) =>
            searchApplicationInput.trim() === "" ||
            `${app.user.firstName} ${app.user.lastName}`
              .toLowerCase()
              .includes(searchApplicationInput.toLowerCase()) ||
            (app.user.email && app.user.email.toLowerCase().includes(searchApplicationInput.toLowerCase())) ||
            (app.user.matricule && app.user.matricule.toLowerCase().includes(searchApplicationInput.toLowerCase()))
          );
      case "attente":
        return applications
          .filter((app) => app.inscriptionStatus === "ATTENTE")
          .filter((app) =>
            searchApplicationInput.trim() === "" ||
            `${app.user.firstName} ${app.user.lastName}`
              .toLowerCase()
              .includes(searchApplicationInput.toLowerCase()) ||
            (app.user.email && app.user.email.toLowerCase().includes(searchApplicationInput.toLowerCase())) ||
            (app.user.matricule && app.user.matricule.toLowerCase().includes(searchApplicationInput.toLowerCase()))
          );
      case "finale":
        return applications
          .filter(
            (app) => app.inscriptionStatus === "FINAL"
          )
          .filter((app) =>
            searchApplicationInput.trim() === "" ||
            `${app.user.firstName} ${app.user.lastName}`
              .toLowerCase()
              .includes(searchApplicationInput.toLowerCase()) ||
            (app.user.email && app.user.email.toLowerCase().includes(searchApplicationInput.toLowerCase())) ||
            (app.user.matricule && app.user.matricule.toLowerCase().includes(searchApplicationInput.toLowerCase()))
          );
      default:
        return applications;
    }
  }

  async function handleAddApplication() {
    if (!selectedUserId) {
      setError("Veuillez sélectionner un employé");
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token || !excursion) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/applications/manual`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            excursionId: excursion.id,
            userId: selectedUserId,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors de l'ajout de l'inscription");
      }

      setError(null);
      setIsModalOpen(false);
      setSelectedUserId(null);
      setSearchUserInput("");

      // Recharger les données
      const token2 =
        typeof window !== "undefined"
          ? localStorage.getItem("ocp_token")
          : null;
      if (token2 && id) {
        const resApplications = await fetch(
          `${API_BASE_URL}/excursions/${id}/applications`,
          {
            headers: {
              Authorization: `Bearer ${token2}`,
            },
          }
        );
        if (resApplications.ok) {
          const applicationsData = await resApplications.json();
          setApplications(applicationsData);
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartSelection() {
    if (!selectionMaxPlaces) {
      setError("Veuillez entrer le nombre de places");
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token || !excursion) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/selection/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          excursionId: excursion.id,
          maxPlaces: Number(selectionMaxPlaces),
          sortBy: selectionSortBy,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors du lancement");
      }

      setError(null);
      setIsSelectionModalOpen(false);
      
      // Recharger les données
      const token2 =
        typeof window !== "undefined"
          ? localStorage.getItem("ocp_token")
          : null;
      if (token2 && id) {
        const resApplications = await fetch(
          `${API_BASE_URL}/excursions/${id}/applications`,
          {
            headers: {
              Authorization: `Bearer ${token2}`,
            },
          }
        );
        if (resApplications.ok) {
          const applicationsData = await resApplications.json();
          setApplications(applicationsData);
          setActiveTab("selectionnes");
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmPayment() {
    if (selectedApplicationsForPayment.length === 0) {
      setError("Veuillez sélectionner au moins un participant");
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

    setConfirmingPayment(true);

    try {
      // Confirmer le paiement pour chaque application sélectionnée
      for (const appId of selectedApplicationsForPayment) {
        const res = await fetch(
          `${API_BASE_URL}/admin/selection/confirm-payment`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              applicationId: appId,
            }),
          }
        );

        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.message || "Erreur lors de la confirmation du paiement");
        }
      }

      setError(null);
      setIsPaymentConfirmationModalOpen(false);
      setPaymentSearchInput("");
      setSelectedApplicationsForPayment([]);

      // Recharger les données
      if (id) {
        const resApplications = await fetch(
          `${API_BASE_URL}/excursions/${id}/applications`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (resApplications.ok) {
          const applicationsData = await resApplications.json();
          setApplications(applicationsData);
        }
      }

      // Afficher un message de succès
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successMessage.textContent = `✅ ${selectedApplicationsForPayment.length} paiement(s) confirmé(s) !`;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la confirmation du paiement");
    } finally {
      setConfirmingPayment(false);
    }
  }

  async function handleClearSelections() {
    const isClosed = excursion?.selectionStatus === "CLOSED";
    const msg = isClosed
      ? "Réinitialiser toutes les listes et rouvrir l'activité ? La liste des inscrits est conservée. Vous pourrez relancer la sélection depuis le début (en cas d'erreur, par ex. type d'activité non renseigné). Confirmer ?"
      : "Êtes-vous sûr de vouloir réinitialiser les sélections ? Cela ramènera tous les sélectionnés/attente/final/refusés à INSCRIT (la liste des inscrits est conservée).";
    if (!window.confirm(msg)) {
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token || !excursion) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/selection/clear/${excursion.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors de l'effacement des sélections");
      }

      setError(null);
      setSearchApplicationInput("");

      // Recharger l'excursion (selectionStatus repasse à NOT_STARTED) et les applications
      const resExcursion = await fetch(`${API_BASE_URL}/excursions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resExcursion.ok) {
        const excursionData = await resExcursion.json();
        if (!excursionData.imageUrl && excursionData.city) {
          excursionData.imageUrl = getCityImageUrl(excursionData.city);
        }
        setExcursion(excursionData);
      }

      const resApplications = await fetch(
        `${API_BASE_URL}/excursions/${id}/applications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (resApplications.ok) {
        const applicationsData = await resApplications.json();
        setApplications(applicationsData);
      }

      if (isClosed) {
        setActiveTab("inscriptions");
      }
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm";
      successMessage.textContent = isClosed
        ? "✅ Listes réinitialisées. Vous pouvez relancer la sélection depuis le début."
        : "✅ Sélections réinitialisées avec succès !";
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 4000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'effacement des sélections");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseSelection() {
    if (!window.confirm("Êtes-vous sûr de vouloir clôturer la liste finale ? Cette action ne peut pas être annulée.")) {
      return;
    }

    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token || !excursion) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/selection/close/${excursion.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = body.error ? `${body.message}: ${body.error}` : (body.message || "Erreur lors de la clôture de la liste");
        throw new Error(detail);
      }

      const closeData = await res.json();
      setError(null);

      const pointsCreditedCount = closeData.pointsCreditedCount;
      const pointsMsg = typeof pointsCreditedCount === "number" && pointsCreditedCount > 0
        ? ` ${pointsCreditedCount} participant(s) ont reçu leurs points pour cette activité.`
        : "";

      if (closeData.warnings && closeData.warnings.length > 0) {
        alert("⚠️ Clôture effectuée avec des avertissements :\n\n" + closeData.warnings.join("\n\n") + (pointsMsg ? "\n\n" + pointsMsg.trim() : ""));
      }

      // Recharger les données de l'excursion
      const resExcursion = await fetch(`${API_BASE_URL}/excursions/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (resExcursion.ok) {
        const excursionData = await resExcursion.json();
        if (!excursionData.imageUrl && excursionData.city) {
          excursionData.imageUrl = getCityImageUrl(excursionData.city);
        }
        setExcursion(excursionData);
      }

      // Recharger les applications avec force re-render
      const resApplications = await fetch(
        `${API_BASE_URL}/excursions/${id}/applications?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Cache-Control": "no-cache, no-store, must-revalidate"
          },
        }
      );
      if (resApplications.ok) {
        const applicationsData = await resApplications.json();
        setApplications(JSON.parse(JSON.stringify(applicationsData)));
      }

      // Afficher un message de succès
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md";
      successMessage.textContent = "✅ Liste finale clôturée avec succès !" + pointsMsg;
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la clôture de la liste");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveFromFinal(applicationId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token || !excursion) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/selection/remove-from-final`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            applicationId: applicationId,
            excursionId: excursion.id,
          }),
        }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors de la suppression");
      }

      setError(null);
      setIsRemoveFromFinalModalOpen(false);
      setRemoveFromFinalSearchInput("");

      // Recharger les données
      const resApplications = await fetch(
        `${API_BASE_URL}/excursions/${id}/applications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (resApplications.ok) {
        const applicationsData = await resApplications.json();
        setApplications(applicationsData);
      }

      // Afficher un message de succès
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
      successMessage.textContent = "✅ Participant supprimé de la liste finale !";
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la suppression");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePromoteFromWaitingList(replaceApplicationId: number) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("ocp_token")
        : null;

    if (!token || !excursion) {
      router.replace("/login");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/admin/selection/promote-from-waiting/${excursion.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ replaceApplicationId }),
        }
      );

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Erreur lors de la promotion");
      }

      const data = await res.json();
      setError(null);
      setSearchApplicationInput("");
      setIsPromoteReplaceModalOpen(false);
      setReplaceApplicationIdForPromote(null);

      const resApplications = await fetch(
        `${API_BASE_URL}/excursions/${id}/applications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (resApplications.ok) {
        const applicationsData = await resApplications.json();
        setApplications(applicationsData);
      }

      const name = data.promoted?.participant?.name;
      const replacedName = data.promoted?.replaced?.name;
      const successMessage = document.createElement("div");
      successMessage.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm";
      successMessage.textContent = replacedName
        ? `✅ ${name} a remplacé ${replacedName}. Liste principale inchangée.`
        : (name ? `✅ ${name} promu à la liste principale !` : "✅ Participant promu !");
      document.body.appendChild(successMessage);
      setTimeout(() => {
        successMessage.remove();
      }, 4000);
    } catch (e: any) {
      setError(e.message || "Erreur lors de la promotion");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredUsers = searchUserInput.trim()
    ? users.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`
            .toLowerCase()
            .includes(searchUserInput.toLowerCase()) ||
          (u.email && u.email.toLowerCase().includes(searchUserInput.toLowerCase())) ||
          (u.matricule && u.matricule.toLowerCase().includes(searchUserInput.toLowerCase()))
      )
    : users;

  const selectedParticipantsForPayment = paymentSearchInput.trim()
    ? applications.filter(
        (app) =>
          app.inscriptionStatus === "SELECTIONNE" &&
          (`${app.user.firstName} ${app.user.lastName}`
            .toLowerCase()
            .includes(paymentSearchInput.toLowerCase()) ||
          (app.user.matricule && app.user.matricule.toLowerCase().includes(paymentSearchInput.toLowerCase())))
      )
    : applications.filter((app) => app.inscriptionStatus === "SELECTIONNE");

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          Chargement des détails de l'activité…
        </div>
      </AdminLayout>
    );
  }

  if (error || !excursion) {
    return (
      <AdminLayout>
        <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-900">
          <div className="text-center">
            <p className="text-red-600 mb-4">
              {error || "Activité non trouvée"}
            </p>
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

  const filteredApplications = getFilteredApplications();

  return (
    <AdminLayout>
      {/* Bannière avec image */}
      <div className="relative h-64 bg-gradient-to-br from-emerald-400 to-emerald-600 overflow-hidden">
        <button
          type="button"
          onClick={() => router.push("/admin/activities")}
          className="absolute top-4 left-4 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 shadow-md hover:shadow-lg transition-all"
          title="Retour à la liste des activités"
          aria-label="Retour à la liste des activités"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
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
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-2">{excursion.title}</h1>
            <p className="text-lg mb-2">{excursion.city}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {excursion.activityType?.title && (
                <span className="inline-block px-3 py-1 rounded bg-emerald-600 text-white text-sm font-medium">
                  {excursion.activityType.title}
                </span>
              )}
              <span className="inline-block px-3 py-1 rounded bg-emerald-600 text-white text-sm font-medium">
                {getTypeLabel(excursion.type)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: "details", label: "DETAILS D'ACTIVITE" },
              { id: "inscriptions", label: "LISTE DES INSCRIPTIONS" },
              { id: "selectionnes", label: "LISTE DES SELECTIONNES" },
              { id: "attente", label: "LISTE D'ATTENTE" },
              { id: "finale", label: "LISTE FINALE" },
              { id: "recapitulatif", label: "RECAPITULATIF" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-red-500 text-red-600"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu des onglets */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "details" && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Titre
                </label>
                <p className="text-slate-900 mt-1">{excursion.title}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Type d&apos;activité (prestation)
                </label>
                <p className="text-slate-900 mt-1">
                  {excursion.activityType?.title ?? "—"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Bénéficiaire
                </label>
                <p className="text-slate-900 mt-1">
                  {getTypeLabel(excursion.type)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Numéro de participants
                </label>
                <p className="text-slate-900 mt-1">{excursion.totalSeats}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Direction
                </label>
                <p className="text-slate-900 mt-1">{excursion.city}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Début d'activité
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.startDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Fin d'activité
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.endDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Début d'inscription
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.registrationStartDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Fin d'inscription
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.registrationEndDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Début paiement
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.paymentStartDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Fin Paiement
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.paymentEndDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Date paiement liste d'attente
                </label>
                <p className="text-slate-900 mt-1">
                  {formatDate(excursion.waitingListPaymentDate)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Types d'agent
                </label>
                <p className="text-slate-900 mt-1">
                  {excursion.agentTypes || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">Prix</label>
                <p className="text-slate-900 mt-1">
                  {excursion.price ? `${excursion.price} DH` : "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Tarif enfant
                </label>
                <p className="text-slate-900 mt-1">
                  {excursion.childPrice ? `${excursion.childPrice} DH` : "-"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-500">
                  Hébergement
                </label>
                <p className="text-slate-900 mt-1">{excursion.hotelName}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-500">
                  Description
                </label>
                <p className="text-slate-900 mt-1">
                  {excursion.description || "-"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() =>
                  router.push(`/admin/activities?edit=${excursion.id}`)
                }
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {(activeTab === "inscriptions" ||
          activeTab === "selectionnes" ||
          activeTab === "attente" ||
          activeTab === "finale") && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col" style={{maxHeight: 'calc(100vh - 300px)'}}>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou matricule..."
                  value={searchApplicationInput}
                  onChange={(e) => setSearchApplicationInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-900 whitespace-nowrap">
                  {activeTab === "inscriptions" && "Liste des inscriptions"}
                  {activeTab === "selectionnes" && "Liste des sélectionnés"}
                  {activeTab === "attente" && "Liste d'attente"}
                  {activeTab === "finale" && "Liste finale"}
                </h2>
                {activeTab === "finale" && (
                  <div className="ml-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-semibold text-blue-900">
                      Confirmations: {finalCount}{currentMaxPlaces ? `/${currentMaxPlaces}` : ""}
                    </div>
                    <div className="mt-1 w-48 h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${currentMaxPlaces > 0 ? (finalCount / currentMaxPlaces) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                )}
                {activeTab === "inscriptions" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsSelectionModalOpen(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Démarrer la Sélection
                    </button>
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      + Ajouter une inscription
                    </button>
                  </div>
                )}
                {activeTab === "attente" && (
                  <button
                    onClick={() => {
                      setReplaceApplicationIdForPromote(null);
                      setError(null);
                      setIsPromoteReplaceModalOpen(true);
                    }}
                    disabled={
                      submitting ||
                      applications.filter((a) => a.inscriptionStatus === "ATTENTE").length === 0 ||
                      applications.filter((a) => a.inscriptionStatus === "SELECTIONNE" || a.inscriptionStatus === "FINAL").length === 0
                    }
                    className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                    title="Choisir qui remplacer dans la liste principale pour garder le même nombre de places"
                  >
                    📤 Passer à la liste principale
                  </button>
                )}
                {activeTab === "selectionnes" && (
                  <button
                    onClick={() => handleClearSelections()}
                    disabled={excursion?.selectionStatus === "CLOSED"}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    🔄 Clear
                  </button>
                )}
                {activeTab === "finale" && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setIsPaymentConfirmationModalOpen(true)}
                      disabled={excursion?.selectionStatus === "CLOSED"}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      💳 Confirmer le paiement
                    </button>
                    <button
                      onClick={() => handleCloseSelection()}
                      disabled={submitting || excursion?.selectionStatus === "CLOSED"}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      🔒 Clôturer la liste
                    </button>
                    <button
                      onClick={() => setIsRemoveFromFinalModalOpen(true)}
                      disabled={submitting || finalCount === 0}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      ❌ Supprimer de la liste
                    </button>
                    <button
                      onClick={() => handleClearSelections()}
                      disabled={submitting}
                      className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                      title="Réinitialiser les listes et rouvrir l'activité si elle est clôturée (en cas d'erreur). Conserve les inscrits."
                    >
                      🔄 Réinitialiser les listes
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Barre d'export : Copy, CSV, Excel, PDF, Print, Visibilité colonnes */}
            <div className="px-6 py-2 border-b border-slate-200 flex items-center gap-2 flex-wrap bg-slate-50">
              <span className="text-xs text-slate-500 mr-2">Exporter :</span>
              <button
                type="button"
                onClick={handleExportCopy}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                CSV
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                PDF
              </button>
              <button
                type="button"
                onClick={handleExportPrint}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              >
                Print
              </button>
              <div className="relative ml-2">
                <button
                  type="button"
                  onClick={() => setExportColumnVisibilityOpen((v) => !v)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border ${exportColumnVisibilityOpen ? "bg-slate-200 border-slate-400" : "border-slate-300 bg-white"} text-slate-700 hover:bg-slate-100`}
                >
                  Column visibility
                </button>
                {exportColumnVisibilityOpen && (
                  <div className="absolute top-full left-0 mt-1 py-2 px-3 bg-white border border-slate-200 rounded shadow-lg z-10 min-w-[180px]">
                    {activeTab === "selectionnes" && (
                      <label className="flex items-center gap-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={columnVisibility.rang}
                          onChange={(e) =>
                            setColumnVisibility((v) => ({ ...v, rang: e.target.checked }))
                          }
                        />
                        <span className="text-sm">Rang</span>
                      </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.matricule}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, matricule: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Matricule</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.nom}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, nom: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Nom</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.prenom}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, prenom: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Prénom</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.email}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, email: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.points}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, points: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Points</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.score}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, score: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Score</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={columnVisibility.date}
                        onChange={(e) =>
                          setColumnVisibility((v) => ({ ...v, date: e.target.checked }))
                        }
                      />
                      <span className="text-sm">Date inscription</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1">
              {filteredApplications.length === 0 ? (
                <p className="px-6 py-8 text-sm text-slate-600 text-center">
                  {searchApplicationInput.trim() ? "Aucun candidat trouvé." : "Aucune inscription pour le moment."}
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {activeTab === "selectionnes" && columnVisibility.rang && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Rang
                        </th>
                      )}
                      {columnVisibility.matricule && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Matricule
                        </th>
                      )}
                      {columnVisibility.nom && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Nom
                        </th>
                      )}
                      {columnVisibility.prenom && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Prénom
                        </th>
                      )}
                      {columnVisibility.email && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Email
                        </th>
                      )}
                      {columnVisibility.points && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Points
                        </th>
                      )}
                      {columnVisibility.score && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Score
                        </th>
                      )}
                      {columnVisibility.date && (
                        <th className="px-4 py-3 text-left text-slate-700 font-medium">
                          Date inscription
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50">
                        {activeTab === "selectionnes" && columnVisibility.rang && (
                          <td className="px-4 py-3 text-slate-900 font-semibold text-center bg-blue-50">
                            {app.selectionOrder || "-"}
                          </td>
                        )}
                        {columnVisibility.matricule && (
                          <td className="px-4 py-3 text-slate-900">
                            {app.user.matricule || "-"}
                          </td>
                        )}
                        {columnVisibility.nom && (
                          <td className="px-4 py-3 text-slate-900">
                            {app.user.lastName}
                          </td>
                        )}
                        {columnVisibility.prenom && (
                          <td className="px-4 py-3 text-slate-900">
                            {app.user.firstName}
                          </td>
                        )}
                        {columnVisibility.email && (
                          <td className="px-4 py-3 text-slate-900">
                            {app.user.email}
                          </td>
                        )}
                        {columnVisibility.points && (
                          <td className="px-4 py-3 text-slate-900">
                            {app.user.points}
                          </td>
                        )}
                        {columnVisibility.score && (
                          <td className="px-4 py-3 text-slate-900">
                            {app.computedScore
                              ? app.computedScore.toFixed(2)
                              : "-"}
                          </td>
                        )}
                        {columnVisibility.date && (
                          <td className="px-4 py-3 text-slate-900">
                            {formatDate(app.createdAt)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal d'ajout d'inscription */}
            {isModalOpen && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-[1px]">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">
                    Ajouter une inscription manuelle
                  </h2>

                  {error && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    {/* Affichage de l'activité */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Activité
                      </label>
                      <div className="p-3 bg-slate-50 border border-slate-300 rounded text-slate-900">
                        {excursion?.title} - {excursion?.city}
                      </div>
                    </div>

                    {/* Recherche et sélection d'employé */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Employé
                      </label>
                      <input
                        type="text"
                        placeholder="Rechercher par nom, email ou matricule..."
                        value={searchUserInput}
                        onChange={(e) => setSearchUserInput(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-2"
                      />

                      {searchUserInput.trim() && (
                        <div className="max-h-48 overflow-y-auto border border-slate-300 rounded-lg bg-white">
                          {filteredUsers.length === 0 ? (
                            <div className="p-3 text-slate-600 text-sm">
                              Aucun employé trouvé
                            </div>
                          ) : (
                            filteredUsers.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setSearchUserInput(
                                    `${user.firstName} ${user.lastName}`
                                  );
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors ${
                                  selectedUserId === user.id
                                    ? "bg-emerald-100 border-l-4 border-emerald-600"
                                    : ""
                                }`}
                              >
                                <div className="font-medium text-slate-900">
                                  {user.firstName} {user.lastName}
                                </div>
                                <div className="text-xs text-slate-600">
                                  {user.email} • {user.matricule}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {selectedUserId && (
                        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-900">
                          ✓{" "}
                          {users.find((u) => u.id === selectedUserId)?.firstName}{" "}
                          {users.find((u) => u.id === selectedUserId)?.lastName}{" "}
                          sélectionné
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsModalOpen(false);
                        setSelectedUserId(null);
                        setSearchUserInput("");
                      }}
                      className="flex-1 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleAddApplication}
                      disabled={submitting || !selectedUserId}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? "Ajout..." : "Ajouter"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de démarrage de sélection */}
            {isSelectionModalOpen && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-[1px]">
                <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">
                    Démarrer la Sélection
                  </h2>

                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                    <p className="font-medium mb-1">📋 Note :</p>
                    <p className="mb-2">
                      Le critère principal de sélection est le <strong>total de points accumulés</strong> par chaque participant (priorité aux plus faibles). Le critère de tri ci-dessous précise l’ordre ; en cas d’égalité, la date d’inscription peut être utilisée.
                    </p>
                    <p className="text-xs text-blue-700">
                      Indiquez le nombre de places à pourvoir. Les N premiers au classement seront sélectionnés, les autres mis en liste d’attente.
                    </p>
                  </div>

                  {error && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Nombre de places à sélectionner *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={excursion?.totalSeats}
                        value={selectionMaxPlaces}
                        onChange={(e) => setSelectionMaxPlaces(e.target.value)}
                        placeholder="Ex. 30"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Maximum : {excursion?.totalSeats ?? "—"} places pour cette activité.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Critère de tri
                      </label>
                      <select
                        value={selectionSortBy}
                        onChange={(e) => setSelectionSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="points">Points bas en priorité (récompenser les moins actifs)</option>
                        <option value="date">Date d&apos;inscription (anciens inscrits d&apos;abord)</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-500">
                        En cas d&apos;égalité, l&apos;autre critère ou la date est utilisée.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setIsSelectionModalOpen(false);
                        setSelectionMaxPlaces("");
                        setSelectionSortBy("points");
                        setError(null);
                      }}
                      className="flex-1 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleStartSelection}
                      disabled={submitting || !selectionMaxPlaces}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {submitting ? "Démarrage..." : "Démarrer"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "recapitulatif" && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Récapitulatif
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600">📝 Inscriptions totales</p>
                <p className="text-2xl font-bold text-blue-600">
                  {inscritCount}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-slate-600">✅ Sélectionnés</p>
                <p className="text-2xl font-bold text-green-600">
                  {approvedCount}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-slate-600">⏳ En attente</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {waitingListCount}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-slate-600">💳 Paiement confirmé</p>
                <p className="text-2xl font-bold text-purple-600">
                  {finalCount}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-slate-600">❌ Refusés</p>
                <p className="text-2xl font-bold text-red-600">
                  {refusedCount}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">🎯 Places disponibles</p>
                <p className="text-2xl font-bold text-slate-600">
                  {excursion.totalSeats}
                </p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-slate-600">📊 Places restantes</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {Math.max(0, excursion.totalSeats - approvedCount)}
                </p>
              </div>
            </div>
            
            {/* Détails supplémentaires */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Progression de la sélection</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-600">Taux de sélection</span>
                    <span className="text-sm font-medium text-slate-900">
                      {inscritCount > 0 ? ((approvedCount / inscritCount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${inscritCount > 0 ? (approvedCount / inscritCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-600">Taux de confirmation</span>
                    <span className="text-sm font-medium text-slate-900">
                      {approvedCount > 0 ? ((finalCount / approvedCount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${approvedCount > 0 ? (finalCount / approvedCount) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal de confirmation de paiement */}
      {isPaymentConfirmationModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              💳 Confirmer le paiement
            </h2>

            {error && (
              <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rechercher un participant (nom ou matricule)
                </label>
                <input
                  type="text"
                  placeholder="Tapez le nom ou le matricule..."
                  value={paymentSearchInput}
                  onChange={(e) => {
                    setPaymentSearchInput(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {paymentSearchInput.trim() && selectedParticipantsForPayment.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sélectionner les participants à confirmer ({selectedApplicationsForPayment.length})
                  </label>
                  <div className="border border-slate-300 rounded-lg max-h-48 overflow-y-auto">
                    {selectedParticipantsForPayment.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => {
                          setSelectedApplicationsForPayment((prev) =>
                            prev.includes(app.id)
                              ? prev.filter((id) => id !== app.id)
                              : [...prev, app.id]
                          );
                        }}
                        className={`w-full px-4 py-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-3 ${
                          selectedApplicationsForPayment.includes(app.id)
                            ? "bg-purple-50"
                            : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedApplicationsForPayment.includes(app.id)}
                          onChange={() => {}}
                          className="w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">
                            {app.user.firstName} {app.user.lastName}
                          </div>
                          <div className="text-xs text-slate-600">
                            Matricule: {app.user.matricule || "-"} | Email: {app.user.email}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {paymentSearchInput.trim() && selectedParticipantsForPayment.length === 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  Aucun participant sélectionné trouvé.
                </div>
              )}

              {selectedApplicationsForPayment.length > 0 && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                  <div className="font-medium text-purple-900 mb-2">
                    ✓ Participants sélectionnés ({selectedApplicationsForPayment.length}):
                  </div>
                  <div className="text-purple-800 max-h-24 overflow-y-auto space-y-1">
                    {applications
                      .filter((a) => selectedApplicationsForPayment.includes(a.id))
                      .map((app) => (
                        <div key={app.id}>
                          • {app.user.firstName} {app.user.lastName}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPaymentConfirmationModalOpen(false);
                  setPaymentSearchInput("");
                  setSelectedApplicationsForPayment([]);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={confirmingPayment || selectedApplicationsForPayment.length === 0}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {confirmingPayment ? "Confirmation..." : `Confirmer (${selectedApplicationsForPayment.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal : promouvoir de l'attente en choisissant qui remplacer */}
      {isPromoteReplaceModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 flex flex-col">
            <h2 className="text-xl font-bold text-slate-900 mb-2">📤 Passer à la liste principale</h2>
            <p className="text-sm text-slate-600 mb-4">
              Pour garder le nombre de places prévu, choisissez le participant de la liste principale à remplacer. Il passera en liste d&apos;attente.
            </p>
            {(() => {
              const firstWaiting = applications
                .filter((a) => a.inscriptionStatus === "ATTENTE")
                .sort((a, b) => (a.selectionOrder ?? 0) - (b.selectionOrder ?? 0))[0];
              const mainList = applications.filter(
                (a) => a.inscriptionStatus === "SELECTIONNE" || a.inscriptionStatus === "FINAL"
              ).sort((a, b) => (a.selectionOrder ?? 0) - (b.selectionOrder ?? 0));
              return (
                <>
                  {firstWaiting && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-900">
                        Premier en liste d&apos;attente :{" "}
                        <span className="font-semibold">{firstWaiting.user?.firstName} {firstWaiting.user?.lastName}</span>
                      </p>
                      <p className="text-xs text-amber-800 mt-1">Il/Elle remplacera la personne que vous choisissez ci-dessous.</p>
                    </div>
                  )}
                  <p className="text-sm font-medium text-slate-700 mb-2">Choisir le participant à remplacer (il passera en attente) :</p>
                  <div className="overflow-y-auto max-h-60 space-y-2 mb-4">
                    {mainList.map((app) => (
                      <label
                        key={app.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          replaceApplicationIdForPromote === app.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="replaceForPromote"
                          checked={replaceApplicationIdForPromote === app.id}
                          onChange={() => setReplaceApplicationIdForPromote(app.id)}
                          className="w-4 h-4 text-orange-600"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-slate-900">{app.user?.firstName} {app.user?.lastName}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            {app.inscriptionStatus === "FINAL" ? "💳 Liste finale" : "Sélectionné"}
                          </span>
                          {(app.user?.matricule || app.user?.email) && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {app.user?.matricule && `Matr. ${app.user.matricule}`}
                              {app.user?.matricule && app.user?.email && " · "}
                              {app.user?.email}
                            </div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                  {error && (
                    <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPromoteReplaceModalOpen(false);
                        setReplaceApplicationIdForPromote(null);
                        setError(null);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => replaceApplicationIdForPromote != null && handlePromoteFromWaitingList(replaceApplicationIdForPromote)}
                      disabled={submitting || replaceApplicationIdForPromote == null}
                      className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
                    >
                      {submitting ? "En cours…" : "Confirmer le remplacement"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal de suppression de la liste finale */}
      {isRemoveFromFinalModalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-[1px]">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 flex flex-col max-h-96">
            <h2 className="text-xl font-bold text-slate-900 mb-4">❌ Supprimer de la liste finale</h2>
            {error && <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Rechercher..."
                value={removeFromFinalSearchInput}
                onChange={(e) => setRemoveFromFinalSearchInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 mb-4">
              {applications.filter((app) => app.inscriptionStatus === "FINAL").filter((app) => {
                const s = removeFromFinalSearchInput.toLowerCase();
                return app.user?.firstName.toLowerCase().includes(s) || app.user?.lastName.toLowerCase().includes(s) || app.user?.email.toLowerCase().includes(s) || app.user?.matricule?.toLowerCase().includes(s);
              }).map((app) => (
                <div key={app.id} className="flex items-center justify-between p-3 border-b border-slate-200 hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{app.user?.firstName} {app.user?.lastName}</div>
                    <div className="text-sm text-slate-500">{app.user?.email} - {app.user?.matricule}</div>
                  </div>
                  <button onClick={() => handleRemoveFromFinal(app.id)} disabled={submitting} className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-60 text-sm font-medium">Supprimer</button>
                </div>
              ))}
              {applications.filter((app) => app.inscriptionStatus === "FINAL").length === 0 && <p className="text-center text-slate-600 py-4">Aucun participant.</p>}
            </div>
            <button onClick={() => { setIsRemoveFromFinalModalOpen(false); setRemoveFromFinalSearchInput(""); setError(null); }} className="w-full px-4 py-2 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50">Fermer</button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
