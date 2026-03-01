import { Router } from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { requireAdmin } from "../middleware/auth";
import { prisma } from "../db";

export const adminHistoryRouter = Router();

/**
 * Liste de toutes les inscriptions (historique) avec recherche optionnelle par matricule ou nom/prénom
 * GET /admin/history/inscriptions?search=xxx
 */
adminHistoryRouter.get(
  "/inscriptions",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const search = (req.query.search as string)?.trim() || "";

    try {
      const applications = await prisma.excursionApplication.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
            },
          },
          excursion: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              activityType: { select: { id: true, title: true, beneficiary: true } },
            },
          },
        },
      });

      // Filtre optionnel par matricule ou nom/prénom (côté serveur)
      let filtered = applications;
      if (search) {
        const q = search.toLowerCase();
        filtered = applications.filter((app) => {
          const mat = (app.user.matricule || "").toLowerCase();
          const last = (app.user.lastName || "").toLowerCase();
          const first = (app.user.firstName || "").toLowerCase();
          return (
            mat.includes(q) ||
            last.includes(q) ||
            first.includes(q) ||
            `${first} ${last}`.includes(q) ||
            `${last} ${first}`.includes(q)
          );
        });
      }

      const userIds = [...new Set(filtered.map((a) => a.userId))];
      const pointHistory = await prisma.userPointHistory.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, delta: true, reason: true },
      });

      // Pour chaque inscription, retrouver les points crédités (reason = "Points activité clôturée: {titre} ({type})")
      // On matche exactement le titre pour ne pas additionner une autre excursion (ex: "Excursion Fès" ne doit pas matcher "Excursion Fès 2026")
      const reasonPrefix = "Points activité clôturée: ";
      function getPointsForApp(userId: number, excursionTitle: string): number | null {
        if (!excursionTitle) return null;
        const exactPrefix = reasonPrefix + excursionTitle + " (";
        const entries = pointHistory.filter(
          (h) => h.userId === userId && h.reason && h.reason.startsWith(exactPrefix)
        );
        if (entries.length === 0) return null;
        return entries.reduce((sum, e) => sum + e.delta, 0);
      }

      const rows = filtered.map((app) => {
        const title = app.excursion?.title ?? "";
        const pointsAccumules = getPointsForApp(app.userId, title);

        const statutLabels: Record<string, string> = {
          FINAL: "Liste finale",
          ATTENTE: "Liste d'attente",
          SELECTIONNE: "Sélectionné",
          INSCRIT: "Inscrit",
          REFUSE: "Refusé",
        };
        const statutInscription = statutLabels[app.inscriptionStatus] ?? app.inscriptionStatus;
        const participationEffective = app.inscriptionStatus === "FINAL" && app.paymentConfirmed;

        return {
          id: app.id,
          userId: app.userId,
          matricule: app.user.matricule ?? "",
          nomUtilisateur: app.user.lastName,
          prenomUtilisateur: app.user.firstName,
          nomActivite: app.excursion?.title ?? "",
          typeActivite: app.excursion?.activityType ? `${app.excursion.activityType.title}${app.excursion.activityType.beneficiary ? ` ${app.excursion.activityType.beneficiary}` : ""}` : "",
          dateDepart: app.excursion?.startDate ?? null,
          dateFin: app.excursion?.endDate ?? null,
          dateInscription: app.createdAt,
          pointsAccumules: pointsAccumules ?? null,
          inscriptionStatus: app.inscriptionStatus,
          statutInscription,
          paymentConfirmed: app.paymentConfirmed,
          paymentConfirmedDate: app.paymentConfirmedDate ?? null,
          participationEffective,
        };
      });

      return res.json(rows);
    } catch (e: any) {
      console.error("Erreur historique inscriptions:", e);
      return res.status(500).json({
        message: "Erreur lors de la récupération des inscriptions",
        error: e?.message,
      });
    }
  }
);

/**
 * Historique par matricule : utilisateur + historique des points + activités auxquelles il a participé
 * GET /admin/history?matricule=XXX
 */
adminHistoryRouter.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const matricule = (req.query.matricule as string)?.trim();
    if (!matricule) {
      return res.status(400).json({
        message: "Le paramètre matricule est requis (ex: ?matricule=E20214963)",
      });
    }

    try {
      const user = await prisma.user.findFirst({
        where: { matricule: { equals: matricule, mode: "insensitive" } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          matricule: true,
          email: true,
          points: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          message: "Aucun utilisateur trouvé avec ce numéro de matricule.",
        });
      }

      const [pointHistory, applications] = await Promise.all([
        prisma.userPointHistory.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            delta: true,
            reason: true,
            createdAt: true,
          },
        }),
        prisma.excursionApplication.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          include: {
            excursion: {
              select: {
                id: true,
                title: true,
                city: true,
                type: true,
                startDate: true,
                endDate: true,
                pointsCreditedAt: true,
                activityType: { select: { id: true, title: true, beneficiary: true } },
              },
            },
          },
        }),
      ]);

      return res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          matricule: user.matricule,
          email: user.email,
          points: user.points,
        },
        pointHistory,
        applications: applications.map((app) => ({
          id: app.id,
          inscriptionStatus: app.inscriptionStatus,
          paymentConfirmed: app.paymentConfirmed,
          createdAt: app.createdAt,
          excursion: app.excursion,
        })),
      });
    } catch (e: any) {
      console.error("Erreur historique:", e);
      return res.status(500).json({
        message: "Erreur lors de la récupération de l'historique",
        error: e?.message,
      });
    }
  }
);
