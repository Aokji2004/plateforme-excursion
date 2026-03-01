import { Router } from "express";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { prisma } from "../db";

export const childrenRouter = Router();

// GET vue d'ensemble : employés mariés avec nombre d'enfants (pour l'onglet Enfants)
childrenRouter.get(
  "/overview",
  authenticateToken,
  requireAdmin,
  async (_req: AuthenticatedRequest, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { maritalStatus: "MARRIED" },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          matricule: true,
          _count: { select: { children: true } },
        },
      });
      const totalChildren = await prisma.child.count();
      return res.json({
        users: users.map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          matricule: u.matricule,
          childrenCount: u._count.children,
        })),
        totalChildren,
      });
    } catch (e: any) {
      console.error("Error fetching children overview:", e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération de la vue d'ensemble" });
    }
  }
);

// GET children for a user
childrenRouter.get(
  "/user/:userId/children",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const userIdNum = parseInt(Array.isArray(userId) ? userId[0] : userId);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: "ID utilisateur invalide" });
      }

      const children = await prisma.child.findMany({
        where: { parentId: userIdNum },
        orderBy: { dateOfBirth: "asc" },
      });

      return res.json(children);
    } catch (e: any) {
      console.error("Error fetching children:", e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération des enfants" });
    }
  }
);

// POST create child
childrenRouter.post(
  "/user/:userId/children",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, dateOfBirth, gender } = req.body;
      const userIdNum = parseInt(Array.isArray(userId) ? userId[0] : userId);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: "ID utilisateur invalide" });
      }

      if (!firstName || !lastName || !dateOfBirth || !gender) {
        return res.status(400).json({
          message: "firstName, lastName, dateOfBirth et gender sont obligatoires",
        });
      }

      // Vérifier que l'utilisateur existe et qu'il est marié
      const user = await prisma.user.findUnique({
        where: { id: userIdNum },
        select: { id: true, maritalStatus: true },
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      if (user.maritalStatus !== "MARRIED") {
        return res.status(400).json({
          message:
            "Seuls les employés mariés peuvent avoir des enfants enregistrés. Veuillez mettre à jour la situation familiale dans « Situation Familiale ».",
        });
      }

      const child = await prisma.child.create({
        data: {
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          parentId: userIdNum,
        },
      });

      return res.status(201).json(child);
    } catch (e: any) {
      console.error("Error creating child:", e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la création de l'enfant" });
    }
  }
);

// DELETE child
childrenRouter.delete(
  "/:childId",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { childId } = req.params;
      const childIdNum = parseInt(Array.isArray(childId) ? childId[0] : childId);

      if (isNaN(childIdNum)) {
        return res.status(400).json({ message: "ID enfant invalide" });
      }

      const child = await prisma.child.findUnique({
        where: { id: childIdNum },
      });

      if (!child) {
        return res.status(404).json({ message: "Enfant non trouvé" });
      }

      await prisma.child.delete({
        where: { id: childIdNum },
      });

      return res.json({ message: "Enfant supprimé avec succès" });
    } catch (e: any) {
      console.error("Error deleting child:", e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la suppression de l'enfant" });
    }
  }
);

export default childrenRouter;
