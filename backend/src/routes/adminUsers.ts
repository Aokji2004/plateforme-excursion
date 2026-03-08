import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { prisma } from "../db";

export const adminUsersRouter = Router();

// Attribuer une situation familiale aux utilisateurs qui n'en ont pas (route en premier pour éviter tout conflit)
const MARITAL_DISTRIBUTION = [
  { status: "MARRIED" as const, weight: 50 },
  { status: "SINGLE" as const, weight: 30 },
  { status: "DIVORCED" as const, weight: 15 },
  { status: "WIDOWED" as const, weight: 5 },
];
function pickRandomMaritalStatus(): "MARRIED" | "SINGLE" | "DIVORCED" | "WIDOWED" {
  const random = Math.random() * 100;
  let cumulative = 0;
  for (const item of MARITAL_DISTRIBUTION) {
    cumulative += item.weight;
    if (random <= cumulative) return item.status;
  }
  return "SINGLE";
}
function generateSpouseName(): string {
  const first = ["Ahmed", "Fatima", "Mohamed", "Leila", "Hassan", "Amina", "Karim", "Yasmine"][Math.floor(Math.random() * 8)];
  const last = ["Alaoui", "Bennani", "Elouafi", "Gharbi", "Jamali", "Saïdi", "Tahar", "Yousfi"][Math.floor(Math.random() * 8)];
  return `${first} ${last}`;
}
function generateSpouseEmail(name: string): string {
  const [f, l] = name.split(" ");
  const domains = ["gmail.com", "outlook.com", "yahoo.fr", "ocp.ma"];
  return `${f.toLowerCase()}.${l?.toLowerCase() || "x"}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

adminUsersRouter.post(
  "/fill-family-status",
  authenticateToken,
  requireAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const usersWithoutStatus = await prisma.user.findMany({
        where: { maritalStatus: null },
      });
      let updated = 0;
      for (const user of usersWithoutStatus) {
        const maritalStatus = pickRandomMaritalStatus();
        const spouse = maritalStatus === "MARRIED" ? generateSpouseName() : null;
        const spouseEmail = spouse ? generateSpouseEmail(spouse) : null;
        await prisma.user.update({
          where: { id: user.id },
          data: { maritalStatus, spouse, spouseEmail },
        });
        updated++;
      }
      return res.json({
        message: `${updated} utilisateur(s) ont reçu une situation familiale.`,
        updated,
        total: usersWithoutStatus.length,
      });
    } catch (e: any) {
      console.error("fill-family-status error:", e);
      const message =
        e?.message || "Erreur lors de l'attribution des situations familiales.";
      return res.status(500).json({ message });
    }
  }
);

// Liste des utilisateurs (admin) — remplit automatiquement les situations familiales manquantes
// Query: ?search=xxx — filtre par matricule ou nom/prénom (insensible à la casse)
adminUsersRouter.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const usersWithoutStatus = await prisma.user.findMany({
        where: { maritalStatus: null },
        select: { id: true },
      });
      for (const user of usersWithoutStatus) {
        const maritalStatus = pickRandomMaritalStatus();
        const spouse = maritalStatus === "MARRIED" ? generateSpouseName() : null;
        const spouseEmail = spouse ? generateSpouseEmail(spouse) : null;
        await prisma.user.update({
          where: { id: user.id },
          data: { maritalStatus, spouse, spouseEmail },
        });
      }
    } catch (e: any) {
      console.error("Remplissage situations familiales:", e);
    }

    const rawSearch = (req.query.search as string)?.trim() || "";
    const searchTerms = rawSearch ? rawSearch.split(/\s+/).filter(Boolean) : [];

    const whereSearch =
      searchTerms.length > 0
        ? {
            AND: searchTerms.map((term) => ({
              OR: [
                { matricule: { contains: term, mode: "insensitive" as const } },
                { firstName: { contains: term, mode: "insensitive" as const } },
                { lastName: { contains: term, mode: "insensitive" as const } },
              ],
            })),
          }
        : undefined;

    const users = await prisma.user.findMany({
      where: whereSearch,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        matricule: true,
        role: true,
        points: true,
        maritalStatus: true,
        spouse: true,
        spouseEmail: true,
        createdAt: true,
      },
    });

    return res.json(users);
  }
);

// Création d'un utilisateur (admin)
adminUsersRouter.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const {
      email,
      firstName,
      lastName,
      matricule,
      role,
      password,
      points,
    } = req.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      matricule?: string;
      role?: "ADMIN" | "EMPLOYEE";
      password?: string;
      points?: number;
    };

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        message: "Email, prénom, nom et mot de passe sont obligatoires.",
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          matricule: matricule || null,
          role: role ?? "EMPLOYEE",
          points: points ?? 0,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          matricule: true,
          role: true,
          points: true,
          createdAt: true,
        },
      });

      return res.status(201).json(user);
    } catch (e: any) {
      console.error(e);
      return res
        .status(400)
        .json({ message: "Erreur lors de la création de l'utilisateur." });
    }
  }
);

// Import en masse (CSV/Excel) — body: { users: [{ email, firstName, lastName, matricule?, role?, password?, points? }], defaultPassword?: string }
adminUsersRouter.post(
  "/import",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const { users: rawUsers, defaultPassword } = req.body as {
      users?: Array<{
        email?: string;
        firstName?: string;
        lastName?: string;
        matricule?: string;
        role?: string;
        password?: string;
        points?: number;
      }>;
      defaultPassword?: string;
    };

    if (!Array.isArray(rawUsers) || rawUsers.length === 0) {
      return res.status(400).json({
        message: "Le corps de la requête doit contenir un tableau 'users' non vide.",
      });
    }

    const fallbackPassword = (defaultPassword && defaultPassword.trim()) || "MotDePasse1!";
    const created: number[] = [];
    const skipped: { row: number; email: string; reason: string }[] = [];
    const errors: { row: number; email?: string; message: string }[] = [];

    for (let i = 0; i < rawUsers.length; i++) {
      const row = rawUsers[i];
      const rowNum = i + 1;
      const email = typeof row?.email === "string" ? row.email.trim() : "";
      const firstName = typeof row?.firstName === "string" ? row.firstName.trim() : "";
      const lastName = typeof row?.lastName === "string" ? row.lastName.trim() : "";

      if (!email || !firstName || !lastName) {
        errors.push({
          row: rowNum,
          email: email || undefined,
          message: "Email, prénom et nom sont obligatoires.",
        });
        continue;
      }

      const role = (row?.role === "ADMIN" ? "ADMIN" : "EMPLOYEE") as "ADMIN" | "EMPLOYEE";
      const matricule = typeof row?.matricule === "string" ? row.matricule.trim() || null : null;
      const points = typeof row?.points === "number" && row.points >= 0 ? row.points : 0;
      const password = typeof row?.password === "string" && row.password.trim() ? row.password.trim() : fallbackPassword;

      try {
        const existing = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (existing) {
          skipped.push({ row: rowNum, email, reason: "Email déjà existant" });
          continue;
        }
        if (matricule) {
          const existingMat = await prisma.user.findFirst({
            where: { matricule },
          });
          if (existingMat) {
            skipped.push({ row: rowNum, email, reason: "Matricule déjà existant" });
            continue;
          }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
          data: {
            email: email.toLowerCase(),
            passwordHash,
            firstName,
            lastName,
            matricule,
            role,
            points,
          },
          select: { id: true },
        });
        created.push(user.id);
      } catch (e: any) {
        errors.push({
          row: rowNum,
          email,
          message: e?.message || "Erreur lors de la création",
        });
      }
    }

    return res.json({
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      details: { createdIds: created, skipped, errors },
    });
  }
);

// Récupération d'un utilisateur par ID (admin)
adminUsersRouter.get(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          matricule: true,
          role: true,
          points: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      return res.json(user);
    } catch (e: any) {
      console.error(e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération de l'utilisateur." });
    }
  }
);

// Mise à jour de la situation familiale uniquement (doit être avant PUT /:id)
adminUsersRouter.put(
  "/:id/family-status",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    const { maritalStatus, spouse, spouseEmail } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      const updateData: Record<string, unknown> = {};
      if (maritalStatus !== undefined) {
        updateData.maritalStatus = maritalStatus || null;
      }
      if (spouse !== undefined) {
        updateData.spouse = spouse || null;
      }
      if (spouseEmail !== undefined) {
        updateData.spouseEmail = spouseEmail || null;
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          matricule: true,
          role: true,
          points: true,
          maritalStatus: true,
          spouse: true,
          spouseEmail: true,
          createdAt: true,
        },
      });

      return res.json(updatedUser);
    } catch (e: any) {
      console.error(e);
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }
      return res
        .status(400)
        .json({ message: "Erreur lors de la mise à jour de l'utilisateur." });
    }
  }
);

// Modification d'un utilisateur (admin) — email, prénom, nom obligatoires
adminUsersRouter.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    const {
      email,
      firstName,
      lastName,
      matricule,
      role,
      password,
      points,
    } = req.body as {
      email?: string;
      firstName?: string;
      lastName?: string;
      matricule?: string;
      role?: "ADMIN" | "EMPLOYEE";
      password?: string;
      points?: number;
    };

    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        message: "Email, prénom et nom sont obligatoires.",
      });
    }

    try {
      const updateData: any = {
        email,
        firstName,
        lastName,
        matricule: matricule || null,
        role: role ?? "EMPLOYEE",
        points: points !== undefined ? points : undefined,
      };

      // Si un nouveau mot de passe est fourni, le hasher
      if (password && password.trim() !== "") {
        updateData.passwordHash = await bcrypt.hash(password, 10);
      }

      const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          matricule: true,
          role: true,
          points: true,
          createdAt: true,
        },
      });

      return res.json(user);
    } catch (e: any) {
      console.error(e);
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }
      return res
        .status(400)
        .json({ message: "Erreur lors de la modification de l'utilisateur." });
    }
  }
);

// Suppression d'un utilisateur (admin)
adminUsersRouter.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          createdExcursions: { select: { id: true } },
        },
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }

      // Impossible de supprimer si l'utilisateur a créé des activités
      if (user.createdExcursions?.length) {
        return res.status(400).json({
          message: "Impossible de supprimer : cet utilisateur a créé des activités. Réattribuez-les ou supprimez-les d'abord.",
        });
      }

      // Supprimer les dépendances avant l'utilisateur (pas de cascade sur ces relations)
      await prisma.excursionApplication.deleteMany({ where: { userId: id } });
      await prisma.userPointHistory.deleteMany({
        where: { OR: [{ userId: id }, { createdById: id }] },
      });

      await prisma.user.delete({
        where: { id },
      });

      return res.status(204).send();
    } catch (e: any) {
      console.error("DELETE /admin/users/:id", e);
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Utilisateur non trouvé." });
      }
      return res
        .status(500)
        .json({ message: "Erreur lors de la suppression de l'utilisateur." });
    }
  }
);

