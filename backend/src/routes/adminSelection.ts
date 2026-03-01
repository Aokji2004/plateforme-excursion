import { Router } from "express";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { SelectionService } from "../services/SelectionService";
import { prisma } from "../db";

export const adminSelectionRouter = Router();

/**
 * Lancer le processus de sélection
 * POST /admin/selection/start
 */
adminSelectionRouter.post(
  "/start",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const {
      excursionId,
      maxPlaces,
      sortBy = "points",
      sortBySecondary,
      paymentDeadline,
    } = req.body;

    if (!excursionId || !maxPlaces) {
      return res.status(400).json({
        message: "excursionId et maxPlaces sont obligatoires",
      });
    }

    if (maxPlaces <= 0) {
      return res.status(400).json({
        message: "maxPlaces doit être supérieur à 0",
      });
    }

    try {
      const result = await SelectionService.startSelection({
        excursionId: Number(excursionId),
        maxPlaces: Number(maxPlaces),
        sortBy: sortBy as "points" | "date",
        sortBySecondary: sortBySecondary as "points" | "date" | undefined,
        paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : undefined,
      });

      return res.json(result);
    } catch (e: any) {
      console.error("Erreur lancement sélection:", e);
      return res.status(500).json({
        message: "Erreur lors du lancement de la sélection",
        error: e.message,
      });
    }
  }
);

/**
 * Confirmer le paiement d'un participant
 * POST /admin/selection/confirm-payment
 */
adminSelectionRouter.post(
  "/confirm-payment",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        message: "applicationId est obligatoire",
      });
    }

    try {
      const result = await SelectionService.confirmPayment(
        Number(applicationId)
      );

      return res.json({
        success: true,
        message: "Paiement confirmé avec succès",
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

/**
 * Refuser un participant (et promouvoir un autre de la liste d'attente)
 * POST /admin/selection/refuse
 */
adminSelectionRouter.post(
  "/refuse",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { applicationId, reason } = req.body;

    if (!applicationId) {
      return res.status(400).json({
        message: "applicationId est obligatoire",
      });
    }

    try {
      const result = await SelectionService.refuseParticipant(
        Number(applicationId),
        reason
      );

      return res.json(result);
    } catch (e: any) {
      console.error("Erreur refus participant:", e);
      return res.status(400).json({
        message: e.message || "Erreur lors du refus du participant",
      });
    }
  }
);

/**
 * Promouvoir manuellement du participant de la liste d'attente
 * POST /admin/selection/promote
 */
adminSelectionRouter.post(
  "/promote",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.body;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }

    try {
      const result = await SelectionService.promoteFromWaitingList(
        Number(excursionId)
      );

      return res.json(result);
    } catch (e: any) {
      console.error("Erreur promotion liste d'attente:", e);
      return res.status(500).json({
        message: "Erreur lors de la promotion de la liste d'attente",
        error: e.message,
      });
    }
  }
);

/**
 * Clôturer la sélection
 * POST /admin/selection/close
 */
adminSelectionRouter.post(
  "/close",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.body;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }

    try {
      const { excursion, warnings, pointsCreditedCount } = await SelectionService.closeSelection(
        Number(excursionId),
        req.user.id
      );

      return res.json({ message: "Sélection clôturée", excursion, warnings: warnings || [], pointsCreditedCount });
    } catch (e: any) {
      console.error("Erreur clôture sélection:", e);
      return res.status(500).json({
        message: "Erreur lors de la clôture de la sélection",
        error: e.message,
      });
    }
  }
);

/**
 * Récupérer TOUS les participants avec leurs statuts
 * GET /admin/selection/participants/:excursionId
 */
adminSelectionRouter.get(
  "/participants/:excursionId",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.params;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }

    try {
      const participants = await SelectionService.getAllParticipants(
        Number(excursionId)
      );

      return res.json(participants);
    } catch (e: any) {
      console.error("Erreur récupération participants:", e);
      return res.status(500).json({
        message: "Erreur lors de la récupération des participants",
        error: e.message,
      });
    }
  }
);

/**
 * Récupérer le récapitulatif final
 * GET /admin/selection/recap/:excursionId
 */
adminSelectionRouter.get(
  "/recap/:excursionId",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.params;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }

    try {
      const recap = await SelectionService.getFinalRecap(Number(excursionId));

      return res.json(recap);
    } catch (e: any) {
      console.error("Erreur récupération récapitulatif:", e);
      return res.status(500).json({
        message: "Erreur lors de la récupération du récapitulatif",
        error: e.message,
      });
    }
  }
);
/**
 * Effacer les sélections (SELECTIONNE, ATTENTE, FINAL -> INSCRIT)
 * POST /admin/selection/clear/:excursionId
 */
adminSelectionRouter.post(
  "/clear/:excursionId",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.params;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }

    try {
      const result = await SelectionService.clearSelections(Number(excursionId));

      return res.json({
        message: "Sélections effacées avec succès",
        clearedCount: result,
      });
    } catch (e: any) {
      console.error("Erreur effacement sélections:", e);
      return res.status(500).json({
        message: "Erreur lors de l'effacement des sélections",
        error: e.message,
      });
    }
  }
);

/**
 * Promouvoir la première personne de la liste d'attente en remplaçant un participant
 * de la liste principale. Body: { replaceApplicationId: number }
 * POST /admin/selection/promote-from-waiting/:excursionId
 */
adminSelectionRouter.post(
  "/promote-from-waiting/:excursionId",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.params;
    const replaceApplicationId = req.body?.replaceApplicationId != null
      ? Number(req.body.replaceApplicationId)
      : NaN;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }
    if (!Number.isInteger(replaceApplicationId) || replaceApplicationId < 1) {
      return res.status(400).json({
        message: "replaceApplicationId (ID du participant à remplacer) est obligatoire",
      });
    }

    try {
      const result = await SelectionService.promoteFromWaitingList(
        Number(excursionId),
        replaceApplicationId
      );

      if (!result || !result.promoted) {
        return res.status(400).json({
          message: result?.message || "Aucune personne en liste d'attente à promouvoir",
        });
      }

      return res.json({
        message: "Personne promue avec succès",
        promoted: result,
      });
    } catch (e: any) {
      console.error("Erreur promotion:", e);
      return res.status(500).json({
        message: "Erreur lors de la promotion",
        error: e.message,
      });
    }
  }
);

/**
 * Clôturer la liste finale
 * POST /admin/selection/close/:excursionId
 */
adminSelectionRouter.post(
  "/close/:excursionId",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { excursionId } = req.params;

    if (!excursionId) {
      return res.status(400).json({
        message: "excursionId est obligatoire",
      });
    }

    try {
      // Vérifier que la sélection n'est pas déjà clôturée
      const excursion = await prisma.excursion.findUnique({
        where: { id: Number(excursionId) },
      });

      if (!excursion) {
        return res.status(404).json({
          message: "Excursion non trouvée",
        });
      }

      if (excursion.selectionStatus === "CLOSED") {
        return res.status(400).json({
          message: "La liste finale est déjà clôturée et ne peut pas être clôturée à nouveau",
        });
      }

      const result = await SelectionService.closeSelection(
        Number(excursionId),
        req.user.id
      );

      return res.json({
        message: "Liste finale clôturée avec succès",
        excursion: result.excursion,
        warnings: result.warnings || [],
        pointsCreditedCount: result.pointsCreditedCount,
      });
    } catch (e: any) {
      console.error("Erreur clôture:", e);
      const detail = e?.message || (typeof e === "string" ? e : "Erreur inconnue");
      return res.status(500).json({
        message: "Erreur lors de la clôture de la liste",
        error: detail,
      });
    }
  }
);

/**
 * Supprimer quelqu'un de la liste finale
 * POST /admin/selection/remove-from-final
 */
adminSelectionRouter.post(
  "/remove-from-final",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const { applicationId, excursionId } = req.body;

    if (!applicationId || !excursionId) {
      return res.status(400).json({
        message: "applicationId et excursionId sont obligatoires",
      });
    }

    try {
      // Récupérer l'application
      const app = await (await import("../db")).prisma.excursionApplication.findUnique({
        where: { id: Number(applicationId) },
      });

      if (!app) {
        return res.status(404).json({
          message: "Application non trouvée",
        });
      }

      if (app.inscriptionStatus !== "FINAL") {
        return res.status(400).json({
          message: "Seuls les participants en liste finale peuvent être supprimés",
        });
      }

      // Ramener le participant à ATTENTE
      const updated = await (await import("../db")).prisma.excursionApplication.update({
        where: { id: Number(applicationId) },
        data: {
          inscriptionStatus: "ATTENTE",
        },
      });

      return res.json({
        message: "Participant supprimé de la liste finale et ramené en attente",
        application: updated,
      });
    } catch (e: any) {
      console.error("Erreur suppression:", e);
      return res.status(500).json({
        message: "Erreur lors de la suppression",
        error: e.message,
      });
    }
  }
);
