import { Router } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../db";
import { SelectionService } from "../services/SelectionService";

export const usersRouter = Router();


// Récupérer les points et l'historique de l'utilisateur actuel
usersRouter.get(
  "/my-points",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    try {
      // Récupérer l'utilisateur avec ses points
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          points: true,
        },
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      // Récupérer l'historique des points
      const pointHistory = await prisma.userPointHistory.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          delta: true,
          reason: true,
          createdAt: true,
        },
      });

      return res.json({
        totalPoints: user.points,
        pointHistory: pointHistory.map(({ delta, ...rest }) => ({
          ...rest,
          points: delta,
        })),
      });
    } catch (e: any) {
      console.error(e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération des points" });
    }
  }
);

// Confirmer le paiement d'une excursion sélectionnée
usersRouter.post(
  "/confirm-payment/:applicationId",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        message: "applicationId est obligatoire",
      });
    }

    try {
      // Vérifier que l'application appartient à l'utilisateur
      const application = await prisma.excursionApplication.findUnique({
        where: { id: Number(applicationId) },
        include: { excursion: true },
      });

      if (!application) {
        return res.status(404).json({
          message: "Inscription non trouvée",
        });
      }

      if (application.userId !== req.user.id) {
        return res.status(403).json({
          message: "Vous ne pouvez confirmer le paiement que pour vos propres inscriptions",
        });
      }

      if (application.inscriptionStatus !== "SELECTIONNE") {
        return res.status(400).json({
          message: "Seules les inscriptions SELECTIONNEES peuvent confirmer un paiement",
        });
      }

      // Confirmer le paiement via SelectionService
      const result = await SelectionService.confirmPayment(Number(applicationId));

      return res.json({
        success: true,
        message: "Paiement confirmé avec succès. Vous êtes maintenant dans la liste finale.",
        data: result,
      });
    } catch (e: any) {
      console.error("Erreur confirmation paiement:", e);
      return res.status(400).json({
        message: e.message || "Erreur lors de la confirmation du paiement",
      });
    }
  }
);
