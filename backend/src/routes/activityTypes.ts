import { Router, Request, Response } from "express";
import { prisma } from "../db";
import { authenticateToken, requireAdmin, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// GET all activity types
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const activityTypes = await prisma.activityType.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(activityTypes);
  } catch (error) {
    console.error("Error fetching activity types:", error);
    res.status(500).json({ error: "Failed to fetch activity types" });
  }
});

// GET single activity type by ID
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const idNum = parseInt(Array.isArray(id) ? id[0] : id);
    const activityType = await prisma.activityType.findUnique({
      where: { id: idNum },
    });

    if (!activityType) {
      return res.status(404).json({ error: "Activity type not found" });
    }

    res.json(activityType);
  } catch (error) {
    console.error("Error fetching activity type:", error);
    res.status(500).json({ error: "Failed to fetch activity type" });
  }
});

// CREATE new activity type
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, beneficiary, points, pointsPerChild, pointsConjoint } = req.body;

      if (!title || !beneficiary || points === undefined || pointsPerChild === undefined) {
        return res.status(400).json({ 
          error: "Missing required fields: title, beneficiary, points, pointsPerChild" 
        });
      }

      const activityType = await prisma.activityType.create({
        data: {
          title,
          beneficiary,
          points: parseInt(points),
          pointsPerChild: parseInt(pointsPerChild),
          pointsConjoint: pointsConjoint !== undefined ? parseInt(pointsConjoint) : 0,
        },
      });

      res.status(201).json(activityType);
    } catch (error) {
      console.error("Error creating activity type:", error);
      res.status(500).json({ error: "Failed to create activity type" });
    }
  }
);

// UPDATE activity type
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const idNum = parseInt(Array.isArray(id) ? id[0] : id);
      const { title, beneficiary, points, pointsPerChild, pointsConjoint } = req.body;

      const activityType = await prisma.activityType.update({
        where: { id: idNum },
        data: {
          ...(title && { title }),
          ...(beneficiary && { beneficiary }),
          ...(points !== undefined && { points: parseInt(points) }),
          ...(pointsPerChild !== undefined && { pointsPerChild: parseInt(pointsPerChild) }),
          ...(pointsConjoint !== undefined && { pointsConjoint: parseInt(pointsConjoint) }),
        },
      });

      res.json(activityType);
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Activity type not found" });
      }
      console.error("Error updating activity type:", error);
      res.status(500).json({ error: "Failed to update activity type" });
    }
  }
);

// DELETE activity type
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const idNum = parseInt(Array.isArray(id) ? id[0] : id);

      await prisma.activityType.delete({
        where: { id: idNum },
      });

      res.json({ success: true, message: "Activity type deleted successfully" });
    } catch (error: any) {
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Activity type not found" });
      }
      console.error("Error deleting activity type:", error);
      res.status(500).json({ error: "Failed to delete activity type" });
    }
  }
);

export default router;
