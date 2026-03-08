import crypto from "crypto";
import { Router } from "express";
import { ExcursionStatus } from "../../generated/prisma/client";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { prisma } from "../db";

function generateInscriptionToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export const excursionsRouter = Router();

// Liste des excursions (employé)
excursionsRouter.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const { status } = req.query as { status?: string };

    const where: any = {};
    if (status && Object.values(ExcursionStatus).includes(status as any)) {
      where.status = status as ExcursionStatus;
    }

    let excursions: any[];
    try {
      excursions = await prisma.excursion.findMany({
        where,
        orderBy: { startDate: "asc" },
        include: { activityType: true },
      });
    } catch (e: any) {
      console.error("Error fetching excursions:", e);
      return res.status(500).json({
        message: e?.message || "Erreur serveur lors du chargement des activités",
      });
    }

    return res.json(excursions);
  }
);

// Détail d'une excursion
excursionsRouter.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id) || id < 1) {
        return res.status(400).json({ message: "ID d'excursion invalide" });
      }
      const excursion = await prisma.excursion.findUnique({
        where: { id },
        include: { days: true, activityType: true },
      });

      if (!excursion) {
        return res.status(404).json({ message: "Excursion non trouvée" });
      }

      return res.json(excursion);
    } catch (e: any) {
      console.error("Erreur GET /excursions/:id:", e);
      return res.status(500).json({ message: e?.message || "Erreur lors du chargement de l'activité" });
    }
  }
);

// Candidature à une excursion (employé)
excursionsRouter.post(
  "/:id/apply",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const excursionId = Number(String(req.params.id));
    if (isNaN(excursionId)) {
      return res.status(400).json({ message: "ID d'excursion invalide" });
    }

    const excursion = await prisma.excursion.findUnique({
      where: { id: excursionId },
    });

    if (!excursion || excursion.status !== "OPEN") {
      return res
        .status(400)
        .json({ message: "Excursion non ouverte aux candidatures" });
    }

    const existing = await prisma.excursionApplication.findFirst({
      where: { excursionId, userId: req.user.id },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Vous avez déjà candidaté à cette excursion" });
    }

    const application = await prisma.excursionApplication.create({
      data: {
        excursionId,
        userId: req.user.id,
      },
      include: {
        excursion: true,
      },
    });

    return res.status(201).json(application);
  }
);

// Récupérer les candidatures de l'utilisateur actuel
excursionsRouter.get(
  "/my-applications",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    try {
      const applications = await prisma.excursionApplication.findMany({
        where: { userId: req.user.id },
        include: {
          excursion: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(applications);
    } catch (e: any) {
      console.error(e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération des candidatures" });
    }
  }
);

// Création des excursions (admin)
excursionsRouter.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const {
      title,
      city,
      hotelName,
      hotelCategory,
      type,
      activityTypeId,
      startDate,
      endDate,
      durationDays,
      totalSeats,
      status,
      registrationStartDate,
      registrationEndDate,
      paymentStartDate,
      paymentEndDate,
      waitingListPaymentDate,
      price,
      childPrice,
      description,
      imageUrl,
      agentTypes,
      days,
      externalFormUrl,
      inscriptionFormTitle,
      inscriptionFormDescription,
    } = req.body;

    // Validation des champs obligatoires
    if (!title || !city || !hotelName || !type || !startDate || !endDate || !totalSeats) {
      return res.status(400).json({
        message: "Les champs suivants sont obligatoires: titre, ville, hôtel, type, dates de début/fin, et nombre de places",
      });
    }

    try {
      // Calculer durationDays si non fourni
      let calculatedDurationDays = durationDays;
      if (!calculatedDurationDays) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end.getTime() - start.getTime();
        calculatedDurationDays = Math.max(
          1,
          Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1
        );
      }

      // Fonction helper pour valider et convertir les dates
      const parseDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        // Vérifier que la date est valide et raisonnable (entre 1900 et 2100)
        if (isNaN(date.getTime())) return null;
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) return null;
        return date;
      };

      // Fonction helper pour convertir les prix
      const parsePrice = (priceValue: any): number | null => {
        if (priceValue === undefined || priceValue === null || priceValue === "") return null;
        const parsed = parseFloat(String(priceValue));
        if (isNaN(parsed)) return null;
        return parsed;
      };

      const parsedStartDate = parseDate(startDate);
      const parsedEndDate = parseDate(endDate);
      
      if (!parsedStartDate || !parsedEndDate) {
        return res.status(400).json({
          message: "Les dates de début et de fin doivent être valides",
        });
      }

      const inscriptionToken = generateInscriptionToken();
      const inscriptionLinkValidFrom = parseDate(registrationStartDate);
      const inscriptionLinkValidUntil = parseDate(registrationEndDate);

      const excursion = await prisma.excursion.create({
        data: {
          title,
          city,
          hotelName,
          hotelCategory: hotelCategory || "",
          type,
          activityTypeId: activityTypeId != null && activityTypeId !== "" ? Number(activityTypeId) : null,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          durationDays: calculatedDurationDays,
          totalSeats: Number(totalSeats),
          status: status || "OPEN",
          registrationStartDate: inscriptionLinkValidFrom,
          registrationEndDate: inscriptionLinkValidUntil,
          paymentStartDate: parseDate(paymentStartDate),
          paymentEndDate: parseDate(paymentEndDate),
          waitingListPaymentDate: parseDate(waitingListPaymentDate),
          price: parsePrice(price),
          childPrice: parsePrice(childPrice),
          description: description || null,
          imageUrl: imageUrl || null,
          agentTypes: agentTypes || null,
          inscriptionToken,
          inscriptionLinkValidFrom,
          inscriptionLinkValidUntil,
          externalFormUrl: externalFormUrl && String(externalFormUrl).trim() ? String(externalFormUrl).trim() : null,
          inscriptionFormTitle: inscriptionFormTitle && String(inscriptionFormTitle).trim() ? String(inscriptionFormTitle).trim() : null,
          inscriptionFormDescription: inscriptionFormDescription && String(inscriptionFormDescription).trim() ? String(inscriptionFormDescription).trim() : null,
          createdById: req.user.id,
          days: {
            create: (days || []).map((d: any, index: number) => ({
              dayIndex: d.dayIndex ?? index + 1,
              title: d.title || `Jour ${index + 1}`,
              description: d.description || "",
            })),
          },
        },
        include: {
          days: true,
          activityType: true,
        },
      });

      return res.status(201).json(excursion);
    } catch (e: any) {
      console.error("Erreur création excursion:", e);
      console.error("Détails de l'erreur:", JSON.stringify(e, null, 2));
      
      // Retourner un message d'erreur plus détaillé
      let errorMessage = "Erreur lors de la création de l'excursion";
      
      if (e.code === "P2002") {
        errorMessage = "Une excursion avec ces informations existe déjà";
      } else if (e.code === "P2003") {
        errorMessage = "Référence invalide (utilisateur non trouvé)";
      } else if (e.meta?.target) {
        errorMessage = `Champ invalide: ${e.meta.target.join(", ")}`;
      } else if (e.message) {
        // Extraire le message d'erreur Prisma si disponible
        const prismaErrorMatch = e.message.match(/Unknown argument `(\w+)`/);
        if (prismaErrorMatch) {
          errorMessage = `Champ non reconnu: ${prismaErrorMatch[1]}. Veuillez redémarrer le serveur backend.`;
        } else {
          errorMessage = e.message;
        }
      }
      
      return res.status(400).json({ 
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? e.message : undefined
      });
    }
  }
);

// Modification d'une excursion (admin)
excursionsRouter.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    const {
      title,
      city,
      hotelName,
      hotelCategory,
      type,
      activityTypeId,
      startDate,
      endDate,
      durationDays,
      totalSeats,
      status,
      registrationStartDate,
      registrationEndDate,
      paymentStartDate,
      paymentEndDate,
      waitingListPaymentDate,
      price,
      childPrice,
      description,
      imageUrl,
      agentTypes,
      days,
      externalFormUrl,
      inscriptionFormTitle,
      inscriptionFormDescription,
    } = req.body;

    try {
      // Fonction helper pour valider et convertir les dates
      const parseDate = (dateValue: any): Date | null => {
        if (!dateValue) return null;
        const date = new Date(dateValue);
        // Vérifier que la date est valide et raisonnable (entre 1900 et 2100)
        if (isNaN(date.getTime())) return null;
        const year = date.getFullYear();
        if (year < 1900 || year > 2100) return null;
        return date;
      };

      // Fonction helper pour convertir les prix
      const parsePrice = (priceValue: any): number | null => {
        if (priceValue === undefined || priceValue === null || priceValue === "") return null;
        const parsed = parseFloat(String(priceValue));
        if (isNaN(parsed)) return null;
        return parsed;
      };

      const parsedStartDate = parseDate(startDate);
      const parsedEndDate = parseDate(endDate);
      
      if (!parsedStartDate || !parsedEndDate) {
        return res.status(400).json({
          message: "Les dates de début et de fin doivent être valides",
        });
      }

      // Supprimer les anciens jours
      await prisma.excursionDay.deleteMany({
        where: { excursionId: id },
      });

      const existing = await prisma.excursion.findUnique({
        where: { id },
        select: { inscriptionToken: true },
      });
      const registrationStart = parseDate(registrationStartDate);
      const registrationEnd = parseDate(registrationEndDate);
      const excursion = await prisma.excursion.update({
        where: { id },
        data: {
          title,
          city,
          hotelName,
          hotelCategory: hotelCategory || "",
          type,
          activityTypeId: activityTypeId != null && activityTypeId !== "" ? Number(activityTypeId) : null,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          durationDays,
          totalSeats: Number(totalSeats),
          status,
          registrationStartDate: registrationStart,
          registrationEndDate: registrationEnd,
          paymentStartDate: parseDate(paymentStartDate),
          paymentEndDate: parseDate(paymentEndDate),
          waitingListPaymentDate: parseDate(waitingListPaymentDate),
          price: parsePrice(price),
          childPrice: parsePrice(childPrice),
          description: description || null,
          imageUrl: imageUrl || null,
          agentTypes: agentTypes || null,
          inscriptionToken: existing?.inscriptionToken ?? generateInscriptionToken(),
          inscriptionLinkValidFrom: registrationStart,
          inscriptionLinkValidUntil: registrationEnd,
          ...(externalFormUrl !== undefined && { externalFormUrl: externalFormUrl && String(externalFormUrl).trim() ? String(externalFormUrl).trim() : null }),
          ...(inscriptionFormTitle !== undefined && { inscriptionFormTitle: inscriptionFormTitle && String(inscriptionFormTitle).trim() ? String(inscriptionFormTitle).trim() : null }),
          ...(inscriptionFormDescription !== undefined && { inscriptionFormDescription: inscriptionFormDescription && String(inscriptionFormDescription).trim() ? String(inscriptionFormDescription).trim() : null }),
          days: {
            create: (days || []).map((d: any, index: number) => ({
              dayIndex: d.dayIndex ?? index + 1,
              title: d.title || `Jour ${index + 1}`,
              description: d.description || "",
            })),
          },
        },
        include: {
          days: true,
          activityType: true,
        },
      });

      return res.json(excursion);
    } catch (e: any) {
      console.error(e);
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Excursion non trouvée." });
      }
      return res
        .status(400)
        .json({ message: "Erreur lors de la modification de l'excursion" });
    }
  }
);

// Générer ou régénérer le lien d'inscription public (admin)
excursionsRouter.post(
  "/:id/generate-inscription-link",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }
    try {
      const existing = await prisma.excursion.findUnique({
        where: { id },
        select: {
          id: true,
          inscriptionToken: true,
          registrationStartDate: true,
          registrationEndDate: true,
        },
      });
      if (!existing) {
        return res.status(404).json({ message: "Excursion non trouvée." });
      }
      const token = existing.inscriptionToken ?? generateInscriptionToken();
      const validFrom = existing.registrationStartDate ?? new Date();
      const validUntil = existing.registrationEndDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const excursion = await prisma.excursion.update({
        where: { id },
        data: {
          inscriptionToken: token,
          inscriptionLinkValidFrom: validFrom,
          inscriptionLinkValidUntil: validUntil,
        },
        include: { days: true, activityType: true },
      });
      return res.json(excursion);
    } catch (e: any) {
      console.error(e);
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Excursion non trouvée." });
      }
      return res.status(400).json({ message: "Erreur lors de la génération du lien." });
    }
  }
);

// Suppression d'une excursion (admin)
excursionsRouter.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    try {
      // Vérifier que l'excursion existe
      const excursion = await prisma.excursion.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!excursion) {
        return res.status(404).json({ message: "Excursion non trouvée." });
      }

      // Supprimer l'excursion (les relations seront gérées par Prisma)
      await prisma.excursion.delete({
        where: { id },
      });

      return res.status(204).send();
    } catch (e: any) {
      console.error(e);
      if (e.code === "P2025") {
        return res.status(404).json({ message: "Excursion non trouvée." });
      }
      return res
        .status(400)
        .json({ message: "Erreur lors de la suppression de l'excursion" });
    }
  }
);

// Récupérer les applications d'une excursion avec filtres (admin)
excursionsRouter.get(
  "/:id/applications",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const id = Number(req.params.id);
    const { status } = req.query as { status?: string };

    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide." });
    }

    try {
      const where: any = { excursionId: id };
      if (status) {
        where.status = status;
      }

      const applications = await prisma.excursionApplication.findMany({
        where,
        select: {
          id: true,
          userId: true,
          excursionId: true,
          status: true,
          inscriptionStatus: true,
          originalInscriptionStatus: true,
          computedScore: true,
          selectionOrder: true,
          paymentConfirmed: true,
          paymentConfirmedDate: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              matricule: true,
              points: true,
              profileIncomplete: true,
            },
          },
        },
        orderBy: [
          { inscriptionStatus: "asc" },
          { selectionOrder: "asc" },
          { computedScore: "desc" },
          { createdAt: "asc" },
        ],
      });

      return res.json(applications);
    } catch (e: any) {
      console.error(e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération des applications" });
    }
  }
);


