import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUserPayload {
  id: number;
  role: "EMPLOYEE" | "ADMIN";
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Token manquant" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res
      .status(500)
      .json({ message: "Configuration JWT manquante côté serveur" });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err || !decoded || typeof decoded !== "object") {
      return res.status(403).json({ message: "Token invalide" });
    }

    const payload = decoded as AuthUserPayload;
    req.user = payload;
    next();
  });
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Accès administrateur requis" });
  }
  next();
}

