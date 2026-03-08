import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { AdminLayout } from "../../components/AdminLayout";
import * as XLSX from "xlsx";
import { API_BASE_URL } from "../../utils/config";

interface ImportRow {
  email: string;
  firstName: string;
  lastName: string;
  matricule?: string;
  role?: "ADMIN" | "EMPLOYEE";
  password?: string;
  points?: number;
}

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportRow[]>([]);
  const [importDefaultPassword, setImportDefaultPassword] = useState("MotDePasse1!");
  const [importDefaultPoints, setImportDefaultPoints] = useState(0);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: number; details?: any } | null>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validateImportRow(row: ImportRow, index: number): string[] {
    const err: string[] = [];
    if (!row.email?.trim()) err.push("Email manquant");
    else if (!emailRegex.test(row.email.trim())) err.push("Email invalide");
    if (!row.firstName?.trim()) err.push("Prénom manquant");
    if (!row.lastName?.trim()) err.push("Nom manquant");
    return err;
  }
  const importRowErrors = importPreviewRows.map((r, i) => validateImportRow(r, i));
  const importValidCount = importRowErrors.filter((e) => e.length === 0).length;
  const importInvalidCount = importPreviewRows.length - importValidCount;
  const duplicateEmails = (() => {
    const seen = new Map<string, number[]>();
    importPreviewRows.forEach((r, i) => {
      const e = (r.email || "").trim().toLowerCase();
      if (!e) return;
      if (!seen.has(e)) seen.set(e, []);
      seen.get(e)!.push(i + 1);
    });
    return [...seen.entries()].filter(([, rows]) => rows.length > 1);
  })();

  const [searchQuery, setSearchQuery] = useState("");
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

  function normalizeHeader(h: string): string {
    return (h || "").trim().toLowerCase().replace(/\s+/g, "").replace(/[éèê]/g, "e").replace(/[àâ]/g, "a");
  }

  function parseFileToImportRows(file: File): Promise<ImportRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = e.target?.result;
          if (!raw) {
            resolve([]);
            return;
          }
          const rows: ImportRow[] = [];
          const name = (file.name || "").toLowerCase();

          if (name.endsWith(".csv")) {
            const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw as ArrayBuffer);
            const lines = text.split(/\r?\n/).filter((l) => l.trim());
            if (lines.length < 2) {
              resolve([]);
              return;
            }
            const sep = text.includes(";") ? ";" : ",";
            const headers = lines[0].split(sep).map((c) => normalizeHeader((c || "").trim().replace(/^["']|["']$/g, "")));
            const findCol = (...names: string[]) => {
              for (const n of names) {
                const i = headers.findIndex((h) => h === n || h.includes(n));
                if (i >= 0) return i;
              }
              return -1;
            };
            const emailIdx = findCol("email");
            const prenomIdx = findCol("prenom", "prénom", "firstname");
            const nomIdx = findCol("nom", "lastname");
            const matriculeIdx = findCol("matricule");
            const roleIdx = findCol("role", "rôle");
            const passwordIdx = findCol("password", "motdepasse", "motdepasse");
            const pointsIdx = findCol("points");

            for (let i = 1; i < lines.length; i++) {
              const cells = lines[i].split(sep).map((c) => (c || "").trim().replace(/^["']|["']$/g, ""));
              const email = (emailIdx >= 0 ? cells[emailIdx] : "")?.trim() || "";
              const firstName = (prenomIdx >= 0 ? cells[prenomIdx] : cells[1])?.trim() || "";
              const lastName = (nomIdx >= 0 ? cells[nomIdx] : cells[2])?.trim() || "";
              if (!email && !firstName && !lastName) continue;
              rows.push({
                email,
                firstName: firstName || "-",
                lastName: lastName || "-",
                matricule: matriculeIdx >= 0 && cells[matriculeIdx] ? cells[matriculeIdx] : undefined,
                role: roleIdx >= 0 && cells[roleIdx]?.toUpperCase() === "ADMIN" ? "ADMIN" : "EMPLOYEE",
                password: passwordIdx >= 0 && cells[passwordIdx] ? cells[passwordIdx] : undefined,
                points: pointsIdx >= 0 && cells[pointsIdx] ? parseInt(cells[pointsIdx], 10) || 0 : undefined,
              });
            }
          } else {
            const wb = XLSX.read(raw, { type: raw instanceof ArrayBuffer ? "array" : "string" });
            const firstSheet = wb.Sheets[wb.SheetNames[0]];
            if (!firstSheet) {
              resolve([]);
              return;
            }
            const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as (string | number)[][];
            if (!data || data.length < 2) {
              resolve([]);
              return;
            }
            const headerRow = (data[0] || []).map((c) => normalizeHeader(String(c)));
            const findCol = (...names: string[]) => {
              for (const n of names) {
                const i = headerRow.findIndex((h) => h === n || h.includes(n));
                if (i >= 0) return i;
              }
              return -1;
            };
            const emailCol = findCol("email");
            const prenomCol = findCol("prenom", "prénom", "firstname");
            const nomCol = findCol("nom", "lastname");
            const matriculeCol = findCol("matricule");
            const roleCol = findCol("role", "rôle");
            const passwordCol = findCol("password", "motdepasse");
            const pointsCol = findCol("points");

            for (let i = 1; i < data.length; i++) {
              const row = data[i] as (string | number)[];
              if (!Array.isArray(row)) continue;
              const get = (j: number) => (j >= 0 && row[j] != null ? String(row[j]).trim() : "");
              const email = get(emailCol);
              const firstName = get(prenomCol >= 0 ? prenomCol : 1);
              const lastName = get(nomCol >= 0 ? nomCol : 2);
              if (!email && !firstName && !lastName) continue;
              const roleVal = get(roleCol).toUpperCase();
              rows.push({
                email,
                firstName: firstName || "-",
                lastName: lastName || "-",
                matricule: matriculeCol >= 0 ? get(matriculeCol) || undefined : undefined,
                role: roleVal === "ADMIN" ? "ADMIN" : "EMPLOYEE",
                password: passwordCol >= 0 ? get(passwordCol) || undefined : undefined,
                points: pointsCol >= 0 ? (parseInt(get(pointsCol), 10) || 0) : undefined,
              });
            }
          }
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Impossible de lire le fichier"));
      if (file.name?.toLowerCase().endsWith(".csv")) {
        reader.readAsText(file, "UTF-8");
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  async function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    try {
      const rows = await parseFileToImportRows(file);
      setImportPreviewRows(rows);
    } catch (err: any) {
      setError(err?.message || "Erreur lors de la lecture du fichier");
      setImportPreviewRows([]);
    }
    e.target.value = "";
  }

  async function handleDoImport() {
    const toSend = importPreviewRows.filter((_, i) => importRowErrors[i].length === 0);
    if (toSend.length === 0) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("ocp_token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }
    setImportLoading(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          users: toSend.map((r) => ({
            email: r.email,
            firstName: r.firstName,
            lastName: r.lastName,
            matricule: r.matricule || null,
            role: r.role || "EMPLOYEE",
            password: r.password || undefined,
            points: r.points ?? importDefaultPoints,
          })),
          defaultPassword: importDefaultPassword.trim() || "MotDePasse1!",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || "Erreur lors de l'import");
      }
      const result = await res.json();
      setImportResult(result);
      if (result.created > 0) {
        const loadRes = await fetch(`${API_BASE_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (loadRes.ok) {
          const data = await loadRes.json();
          setUsers(data);
        }
      }
    } catch (e: any) {
      setError(e?.message || "Erreur lors de l'import");
    } finally {
      setImportLoading(false);
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
                onClick={() => {
                  setImportPreviewRows([]);
                  setImportResult(null);
                  setImportDefaultPassword("MotDePasse1!");
                  setImportDefaultPoints(0);
                  setIsImportModalOpen(true);
                }}
            className="px-4 py-2 rounded border border-emerald-600 text-emerald-700 text-sm font-medium hover:bg-emerald-50"
          >
            Importer (CSV/Excel)
          </button>
          <input
            ref={importFileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleImportFileChange}
          />
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <h2 className="text-lg font-medium">Liste des utilisateurs</h2>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, prénom ou matricule…"
                className="w-full sm:w-72 rounded-lg border border-slate-300 pl-3 pr-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <svg
                className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const filteredUsers = q
              ? users.filter(
                  (u) =>
                    (u.firstName?.toLowerCase().includes(q) ||
                      u.lastName?.toLowerCase().includes(q) ||
                      (u.matricule ?? "").toLowerCase().includes(q))
                )
              : users;
            return filteredUsers.length === 0 ? (
              <p className="text-sm text-slate-600">
                {users.length === 0
                  ? "Aucun utilisateur pour le moment."
                  : "Aucun utilisateur ne correspond à la recherche."}
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
                  {filteredUsers.map((u) => (
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
            );
          })()}
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

      {/* Modal Import CSV/Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Importer des utilisateurs (CSV ou Excel)
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreviewRows([]);
                  setImportResult(null);
                }}
                className="text-slate-500 hover:text-slate-700"
              >
                <span className="text-xl">×</span>
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1">
              <p className="text-sm text-slate-600 mb-3">
                Choisissez un fichier CSV ou Excel avec des colonnes : <strong>email</strong>, <strong>prénom</strong>, <strong>nom</strong> (obligatoires). Optionnel : matricule, rôle (ADMIN/EMPLOYEE), mot de passe, points.
              </p>
              <p className="text-xs text-slate-500 mb-3">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    const csv = "email;prénom;nom;matricule;rôle;mot de passe;points\njean.dupont@ocp.ma;Jean;Dupont;M12345;EMPLOYEE;;0\nmarie.martin@ocp.ma;Marie;Martin;M67890;EMPLOYEE;;0";
                    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "modele_import_utilisateurs.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-emerald-600 hover:underline"
                >
                  Télécharger un modèle CSV (exemple)
                </a>
              </p>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => importFileInputRef.current?.click()}
                  className="px-3 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
                >
                  Choisir un fichier CSV ou Excel
                </button>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Mot de passe par défaut (si absent du fichier) :
                  <input
                    type="text"
                    value={importDefaultPassword}
                    onChange={(e) => setImportDefaultPassword(e.target.value)}
                    className="w-40 rounded border border-slate-300 px-2 py-1 text-sm"
                    placeholder="MotDePasse1!"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  Points par défaut (si absent du fichier) :
                  <input
                    type="number"
                    min={0}
                    value={importDefaultPoints}
                    onChange={(e) => setImportDefaultPoints(Number(e.target.value) || 0)}
                    className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
              </div>
              {importPreviewRows.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 text-sm">
                  <span className="text-emerald-700 font-medium">{importValidCount} ligne(s) valide(s)</span>
                  {importInvalidCount > 0 && (
                    <span className="text-red-600">{importInvalidCount} ligne(s) invalide(s) (seront ignorées)</span>
                  )}
                  {duplicateEmails.length > 0 && (
                    <span className="text-amber-700">
                      Attention : {duplicateEmails.length} email(s) en double dans le fichier
                    </span>
                  )}
                </div>
              )}
              {importResult && (
                <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                  <p className="font-medium text-slate-800">
                    {importResult.created} créé(s), {importResult.skipped} ignoré(s) (déjà existants), {importResult.errors} erreur(s).
                  </p>
                  {importResult.details?.errors?.length > 0 && (
                    <ul className="mt-2 text-red-600 list-disc list-inside">
                      {importResult.details.errors.slice(0, 5).map((err: any, i: number) => (
                        <li key={i}>Ligne {err.row}: {err.message}</li>
                      ))}
                      {importResult.details.errors.length > 5 && (
                        <li>… et {importResult.details.errors.length - 5} autre(s) erreur(s)</li>
                      )}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!importResult?.details) return;
                      const lines: string[] = ["Ligne;Email;Statut;Détail"];
                      (importResult.details.skipped || []).forEach((s: any) => {
                        lines.push(`${s.row};${s.email || ""};Ignoré;${s.reason || ""}`);
                      });
                      (importResult.details.errors || []).forEach((e: any) => {
                        lines.push(`${e.row};${e.email || ""};Erreur;${e.message || ""}`);
                      });
                      lines.push(`Résumé;;Créés;${importResult.created}`);
                      const csv = "\uFEFF" + lines.join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `rapport_import_${new Date().toISOString().slice(0, 10)}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="mt-2 text-emerald-600 hover:underline text-xs font-medium"
                  >
                    Télécharger le rapport (CSV)
                  </button>
                </div>
              )}
              {importPreviewRows.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <p className="px-3 py-2 bg-slate-50 text-xs font-medium text-slate-600">
                    Aperçu ({importPreviewRows.length} ligne(s))
                  </p>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="min-w-full text-xs border border-slate-200">
                      <thead className="bg-slate-100 sticky top-0">
                        <tr>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Ligne</th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Email</th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Prénom</th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Nom</th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Matricule</th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Rôle</th>
                          <th className="border-b border-slate-200 px-2 py-1 text-left">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreviewRows.slice(0, 15).map((r, i) => {
                          const errs = importRowErrors[i] || [];
                          const invalid = errs.length > 0;
                          return (
                            <tr
                              key={i}
                              className={`border-b border-slate-100 ${invalid ? "bg-red-50" : ""}`}
                            >
                              <td className="px-2 py-1">{i + 1}</td>
                              <td className="px-2 py-1">{r.email}</td>
                              <td className="px-2 py-1">{r.firstName}</td>
                              <td className="px-2 py-1">{r.lastName}</td>
                              <td className="px-2 py-1">{r.matricule || "-"}</td>
                              <td className="px-2 py-1">{r.role || "EMPLOYEE"}</td>
                              <td className="px-2 py-1">
                                {invalid ? (
                                  <span className="text-red-600 text-xs" title={errs.join(", ")}>
                                    Invalide : {errs.join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 text-xs">OK</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {importPreviewRows.length > 15 && (
                    <p className="px-3 py-1 text-xs text-slate-500 bg-slate-50">
                      … et {importPreviewRows.length - 15} autre(s) ligne(s)
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreviewRows([]);
                  setImportResult(null);
                }}
                className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleDoImport}
                disabled={importValidCount === 0 || importLoading}
                className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {importLoading
                  ? "Import en cours…"
                  : importValidCount === 0
                    ? "Aucune ligne valide à importer"
                    : `Lancer l'import (${importValidCount} ligne(s) valide(s))`}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}


