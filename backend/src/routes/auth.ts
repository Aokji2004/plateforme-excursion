import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { JWT_CONFIG } from "../config/jwt";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "../db";
export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email et mot de passe sont obligatoires" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Identifiants invalides" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res
        .status(500)
        .json({ message: "Configuration JWT manquante côté serveur" });
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    const signOptions: SignOptions = {
      expiresIn: JWT_CONFIG.accessTokenTtlSeconds,
    };
    const token = jwt.sign(payload, secret, signOptions);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        points: user.points,
      },
    });
  } catch (err) {
    console.error("[auth/login] Erreur:", err);
    next(err);
  }
});

authRouter.get(
  "/me",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    return res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      points: user.points,
    });
  }
);


