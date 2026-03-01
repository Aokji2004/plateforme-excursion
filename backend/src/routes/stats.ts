import { Router } from "express";
import {
  authenticateToken,
  AuthenticatedRequest,
  requireAdmin,
} from "../middleware/auth";
import { prisma } from "../db";

export const statsRouter = Router();

// Statistiques globales pour le dashboard admin
statsRouter.get(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    try {
      // Nombre total d'activités
      const totalActivities = await prisma.excursion.count();

      // Activités par statut
      const openActivities = await prisma.excursion.count({
        where: { status: "OPEN" },
      });
      const closedActivities = await prisma.excursion.count({
        where: { status: "CLOSED" },
      });
      const fullActivities = await prisma.excursion.count({
        where: { status: "FULL" },
      });

      // Nombre total d'inscriptions
      const totalApplications = await prisma.excursionApplication.count();

      // Nombre total d'utilisateurs
      const totalUsers = await prisma.user.count({
        where: { role: "EMPLOYEE" },
      });

      // Statistiques situation familiale et enfants (pour le bloc dashboard)
      const usersWithFamilyStatus = await prisma.user.count({
        where: {
          role: "EMPLOYEE",
          maritalStatus: { not: null },
        },
      });
      const marriedCount = await prisma.user.count({
        where: {
          role: "EMPLOYEE",
          maritalStatus: "MARRIED",
        },
      });
      const totalChildren = await prisma.child.count();

      // Activités par type
      const familyActivities = await prisma.excursion.count({
        where: { type: "FAMILY" },
      });
      const coupleActivities = await prisma.excursion.count({
        where: { type: "COUPLE" },
      });
      const singleActivities = await prisma.excursion.count({
        where: { type: "SINGLE" },
      });

      // Inscriptions par statut
      const approvedApplications = await prisma.excursionApplication.count({
        where: { status: "APPROVED" },
      });
      const pendingApplications = await prisma.excursionApplication.count({
        where: { status: "PENDING" },
      });
      const waitingListApplications = await prisma.excursionApplication.count({
        where: { status: "WAITING_LIST" },
      });

      // Activités récentes (clôturées ou complètes)
      const recentClosedActivities = await prisma.excursion.findMany({
        where: {
          status: {
            in: ["CLOSED", "FULL"],
          },
        },
        orderBy: { endDate: "desc" },
        take: 10,
        include: {
          _count: {
            select: {
              applications: true,
            },
          },
        },
      });

      return res.json({
        totalActivities,
        openActivities,
        closedActivities,
        fullActivities,
        totalApplications,
        totalUsers,
        usersWithFamilyStatus,
        marriedCount,
        totalChildren,
        familyActivities,
        coupleActivities,
        singleActivities,
        approvedApplications,
        pendingApplications,
        waitingListApplications,
        recentClosedActivities,
      });
    } catch (e: any) {
      console.error("Erreur lors de la récupération des statistiques:", e);
      return res
        .status(500)
        .json({ message: "Erreur lors de la récupération des statistiques" });
    }
  }
);
