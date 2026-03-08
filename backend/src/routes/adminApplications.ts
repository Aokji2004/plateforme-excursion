import { Router } from "express";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { prisma } from "../db";

export const adminApplicationsRouter = Router();

// Liste de toutes les inscriptions (admin) avec filtres optionnels
adminApplicationsRouter.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const excursionIdParam = req.query.excursionId as string | undefined;
      const excursionId = excursionIdParam ? Number(excursionIdParam) : undefined;
      const search = (req.query.search as string)?.trim() || "";

      const applications = await prisma.excursionApplication.findMany({
        where: {
          ...(excursionId && Number.isInteger(excursionId) ? { excursionId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              matricule: true,
              profileIncomplete: true,
            },
          },
          excursion: {
            select: {
              id: true,
              title: true,
              city: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      let list = applications;
      if (search) {
        const q = search.toLowerCase();
        list = applications.filter(
          (app) =>
            (app.user.matricule && app.user.matricule.toLowerCase().includes(q)) ||
            (app.user.firstName && app.user.firstName.toLowerCase().includes(q)) ||
            (app.user.lastName && app.user.lastName.toLowerCase().includes(q)) ||
            (app.user.email && app.user.email.toLowerCase().includes(q)) ||
            (app.excursion?.title && app.excursion.title.toLowerCase().includes(q))
        );
      }

      return res.json(
        list.map((app) => ({
          id: app.id,
          userId: app.userId,
          excursionId: app.excursionId,
          status: app.status,
          inscriptionStatus: app.inscriptionStatus,
          paymentConfirmed: app.paymentConfirmed,
          createdAt: app.createdAt,
          user: app.user,
          excursion: app.excursion,
        }))
      );
    } catch (e: any) {
      console.error("Erreur liste inscriptions:", e);
      return res.status(500).json({
        message: "Erreur lors de la récupération des inscriptions",
      });
    }
  }
);

// Créer une inscription manuelle (admin seulement)
adminApplicationsRouter.post(
  "/manual",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId, userId } = req.body;

    if (!excursionId || !userId) {
      return res.status(400).json({
        message: "excursionId et userId sont obligatoires",
      });
    }

    try {
      // Vérifier que l'excursion existe
      const excursion = await prisma.excursion.findUnique({
        where: { id: Number(excursionId) },
      });

      if (!excursion) {
        return res.status(404).json({ message: "Excursion non trouvée" });
      }

      // Vérifier que l'utilisateur existe
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      // Vérifier si l'utilisateur a déjà candidaté
      const existing = await prisma.excursionApplication.findFirst({
        where: {
          excursionId: Number(excursionId),
          userId: Number(userId),
        },
      });

      if (existing) {
        return res.status(400).json({
          message: "Cet utilisateur a déjà une inscription pour cette activité",
        });
      }

      // Créer l'inscription
      const application = await prisma.excursionApplication.create({
        data: {
          excursionId: Number(excursionId),
          userId: Number(userId),
          status: "PENDING",
        },
        include: {
          excursion: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      return res.status(201).json({
        message: "Inscription ajoutée avec succès",
        data: application,
      });
    } catch (e: any) {
      console.error("Erreur création inscription manuelle:", e);
      return res.status(500).json({
        message: "Erreur lors de la création de l'inscription",
      });
    }
  }
);
