import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";
import {
  exportCopy,
  exportCSV,
  exportExcel,
  exportPDF,
  printTable,
  type ExportColumn,
} from "../../utils/exportTable";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export interface InscriptionRow {
  id: number;
  userId: number;
  matricule: string;
  nomUtilisateur: string;
  prenomUtilisateur: string;
  nomActivite: string;
  typeActivite: string;
  dateDepart: string | null;
  dateFin: string | null;
  dateInscription: string;
  pointsAccumules: number | null;
  inscriptionStatus: string;
  statutInscription: string;
  paymentConfirmed: boolean;
  paymentConfirmedDate: string | null;
  participationEffective: boolean;
}

const COLUMNS: ExportColumn[] = [
  { key: "id", label: "ID", visible: true },
  { key: "matricule", label: "MLE2 d'utilisateur", visible: true },
  { key: "nomUtilisateur", label: "Nom d'utilisateur", visible: true },
  { key: "prenomUtilisateur", label: "Prénom d'utilisateur", visible: true },
  { key: "cin", label: "CIN", visible: true },
  { key: "nomActivite", label: "Nom d'activité", visible: true },
  { key: "typeActivite", label: "Type d'activité", visible: true },
  { key: "dateDepart", label: "Date de départ", visible: true },
  { key: "dateFin", label: "Date de fin", visible: true },
  { key: "dateInscription", label: "Date d'inscription", visible: true },
  { key: "statutInscription", label: "Statut (liste finale / attente)", visible: true },
  { key: "paiementConfirme", label: "Paiement confirmé", visible: true },
  { key: "datePaiement", label: "Date confirmation paiement", visible: true },
  { key: "participationEffective", label: "Est parti à l'excursion", visible: true },
  { key: "pointsAccumules", label: "Points accumulés", visible: true },
];

function formatDate(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? "-"
    : d.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

function rowToExportRecord(row: InscriptionRow): Record<string, string> {
  return {
    id: String(row.id),
    matricule: row.matricule || "-",
    nomUtilisateur: row.nomUtilisateur || "-",
    prenomUtilisateur: row.prenomUtilisateur || "-",
    cin: "-",
    nomActivite: row.nomActivite || "-",
    typeActivite: row.typeActivite || "-",
    dateDepart: row.dateDepart ? formatDate(row.dateDepart) : "-",
    dateFin: row.dateFin ? formatDate(row.dateFin) : "-",
    dateInscription: formatDate(row.dateInscription),
    statutInscription: row.statutInscription || "-",
    paiementConfirme: row.paymentConfirmed ? "Oui" : "Non",
    datePaiement: row.paymentConfirmedDate ? formatDate(row.paymentConfirmedDate) : "-",
    participationEffective: row.participationEffective ? "Oui" : "Non",
    pointsAccumules: row.pointsAccumules != null ? String(row.pointsAccumules) : "-",
  };
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function AdminHistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<InscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(COLUMNS.map((c) => [c.key, c.visible !== false]))
  );

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
    }
  }, [router]);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
    if (!token) return;

    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/admin/history/inscriptions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok)
          return res.json().then((b) => Promise.reject(new Error(b.message || "Erreur")));
        return res.json();
      })
      .then((data: InscriptionRow[]) => {
        setRows(data);
        setCurrentPage(0);
        setError(null);
      })
      .catch((e) => {
        setError(e.message || "Erreur lors du chargement");
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const mat = (r.matricule || "").toLowerCase();
      const last = (r.nomUtilisateur || "").toLowerCase();
      const first = (r.prenomUtilisateur || "").toLowerCase();
      return (
        mat.includes(q) ||
        last.includes(q) ||
        first.includes(q) ||
        `${first} ${last}`.includes(q) ||
        `${last} ${first}`.includes(q)
      );
    });
  }, [rows, search]);

  useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = currentPage * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const exportRows = useMemo(
    () => filteredRows.map(rowToExportRecord),
    [filteredRows]
  );
  const exportColumns = useMemo(
    () =>
      COLUMNS.map((c) => ({
        ...c,
        visible: columnVisibility[c.key] !== false,
      })),
    [columnVisibility]
  );

  const toggleColumn = (key: string) => {
    setColumnVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleColumns = useMemo(
    () => COLUMNS.filter((c) => columnVisibility[c.key] !== false),
    [columnVisibility]
  );

  return (
    <AdminLayout>
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-slate-200 bg-white shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">
          Historique des Inscriptions
        </h1>
      </header>
      <main className="w-full max-w-full min-w-0 px-3 py-4 md:px-4 md:py-5">
        {/* Barre : pagination + export + visibilité + recherche */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Afficher</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(0);
              }}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} éléments
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                exportCopy(exportRows, exportColumns);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => exportCSV(exportRows, exportColumns, "historique-inscriptions")}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportExcel(exportRows, exportColumns, "historique-inscriptions")
              }
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Excel
            </button>
            <button
              type="button"
              onClick={() =>
                exportPDF(
                  exportRows,
                  exportColumns,
                  "Historique des Inscriptions",
                  "historique-inscriptions"
                )
              }
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={() =>
                printTable(
                  exportRows,
                  exportColumns,
                  "Historique des Inscriptions"
                )
              }
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Print
            </button>
          </div>

          <div className="relative">
            <details className="relative">
              <summary className="cursor-pointer list-none rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Visibilité des colonnes
              </summary>
              <div className="absolute left-0 top-full z-10 mt-1 min-w-[200px] rounded border border-slate-200 bg-white py-2 shadow-lg">
                {COLUMNS.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={columnVisibility[c.key] !== false}
                      onChange={() => toggleColumn(c.key)}
                      className="rounded border-slate-300"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </details>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="history-search" className="text-sm font-medium text-slate-700">
              Rechercher :
            </label>
            <input
              id="history-search"
              type="text"
              placeholder="Matricule ou nom, prénom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="w-full overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">
              Chargement…
            </div>
          ) : (
            <table className="w-full table-auto text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {visibleColumns.map((c) => (
                    <th
                      key={c.key}
                      className="whitespace-nowrap border-b border-slate-200 px-2 py-1.5 text-left font-medium text-slate-700"
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={visibleColumns.length}
                      className="px-2 py-8 text-center text-slate-500"
                    >
                      Aucune inscription trouvée.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      {columnVisibility.id !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-900 truncate">
                          {row.id}
                        </td>
                      )}
                      {columnVisibility.matricule !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-900 truncate">
                          {row.matricule || "-"}
                        </td>
                      )}
                      {columnVisibility.nomUtilisateur !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-900 truncate">
                          {row.nomUtilisateur || "-"}
                        </td>
                      )}
                      {columnVisibility.prenomUtilisateur !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-900 truncate">
                          {row.prenomUtilisateur || "-"}
                        </td>
                      )}
                      {columnVisibility.cin !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-500">
                          -
                        </td>
                      )}
                      {columnVisibility.nomActivite !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-900 truncate">
                          {row.nomActivite || "-"}
                        </td>
                      )}
                      {columnVisibility.typeActivite !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700 truncate">
                          {row.typeActivite || "-"}
                        </td>
                      )}
                      {columnVisibility.dateDepart !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                          {row.dateDepart ? formatDate(row.dateDepart) : "-"}
                        </td>
                      )}
                      {columnVisibility.dateFin !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                          {row.dateFin ? formatDate(row.dateFin) : "-"}
                        </td>
                      )}
                      {columnVisibility.dateInscription !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                          {formatDate(row.dateInscription)}
                        </td>
                      )}
                      {columnVisibility.statutInscription !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5">
                          <span
                            className={`inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
                              row.inscriptionStatus === "FINAL"
                                ? "bg-violet-100 text-violet-800"
                                : row.inscriptionStatus === "ATTENTE"
                                  ? "bg-amber-100 text-amber-800"
                                  : row.inscriptionStatus === "SELECTIONNE"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : row.inscriptionStatus === "REFUSE"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {row.statutInscription}
                          </span>
                        </td>
                      )}
                      {columnVisibility.paiementConfirme !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                          {row.paymentConfirmed ? "Oui" : "Non"}
                        </td>
                      )}
                      {columnVisibility.datePaiement !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 text-slate-700">
                          {row.paymentConfirmedDate ? formatDate(row.paymentConfirmedDate) : "-"}
                        </td>
                      )}
                      {columnVisibility.participationEffective !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5">
                          <span
                            className={
                              row.participationEffective
                                ? "font-medium text-emerald-700"
                                : "text-slate-500"
                            }
                          >
                            {row.participationEffective ? "Oui" : "Non"}
                          </span>
                        </td>
                      )}
                      {columnVisibility.pointsAccumules !== false && (
                        <td className="border-b border-slate-100 px-2 py-1.5 font-medium text-slate-900">
                          {row.pointsAccumules != null ? row.pointsAccumules : "-"}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && rows.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              {filteredRows.length} inscription(s)
              {search.trim() ? " (filtré)" : " au total"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-50"
              >
                Précédent
              </button>
              <span>
                Page {currentPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={currentPage >= totalPages - 1}
                className="rounded border border-slate-300 bg-white px-2 py-1 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
