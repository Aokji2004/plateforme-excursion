import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { validateEnv, env } from "./config/env";
import { authRouter } from "./routes/auth";
import { excursionsRouter } from "./routes/excursions";
import { adminUsersRouter } from "./routes/adminUsers";
import { statsRouter } from "./routes/stats";
import { usersRouter } from "./routes/users";
import { adminApplicationsRouter } from "./routes/adminApplications";
import { adminSelectionRouter } from "./routes/adminSelection";
import activityTypesRouter from "./routes/activityTypes";
import childrenRouter from "./routes/children";
import { adminHistoryRouter } from "./routes/adminHistory";
import { publicInscriptionRouter } from "./routes/publicInscription";
import { prisma } from "./db";

dotenv.config();

// Valider les variables d'environnement au démarrage (strict en production)
validateEnv();

const app = express();

// En-têtes de sécurité
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// CORS : en dev accepter tout localhost (3000, 3001, etc.) ; en prod utiliser CORS_ORIGIN si défini
const corsOptions: cors.CorsOptions = {
  origin:
    env.CORS_ORIGIN !== undefined
      ? env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : env.NODE_ENV === "production"
        ? true
        : (origin, cb) => {
            if (!origin) return cb(null, true);
            if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
            return cb(null, false);
          },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control"],
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));

// Page d'accueil de l'API : HTML lisible en navigateur, JSON pour les clients API
app.get("/", (req, res) => {
  const accept = (req.headers.accept || "").toLowerCase();
  if (accept.includes("text/html")) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OCP Excursions – API</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 2rem auto; padding: 0 1rem; color: #1e293b; }
    h1 { font-size: 1.25rem; color: #0f172a; }
    p { line-height: 1.5; color: #475569; }
    a { color: #059669; font-weight: 500; }
  </style>
</head>
<body>
  <h1>OCP Excursions – API</h1>
  <p>Le backend fonctionne correctement.</p>
  <p>Pour utiliser l’application, ouvrez le <strong>frontend</strong> :</p>
  <p><a href="http://localhost:3000">http://localhost:3000</a></p>
</body>
</html>
    `);
    return;
  }
  res.json({
    name: "OCP Excursions API",
    version: "1.0",
    docs: "Backend de la plateforme. Utilisez le frontend sur http://localhost:3000",
    health: "/health",
    healthDb: "/health/db",
  });
});

// Health check (léger : pas de DB en lecture pour éviter surcharge)
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: env.NODE_ENV });
});

// Health check détaillé (optionnel, pour monitoring : vérifie la DB)
app.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected", timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      timestamp: new Date().toISOString(),
    });
  }
});

// Routes principales
app.use("/auth", authRouter);
app.use("/excursions", excursionsRouter);
app.use("/admin/users", adminUsersRouter);
app.use("/admin/stats", statsRouter);
app.use("/admin/applications", adminApplicationsRouter);
app.use("/admin/selection", adminSelectionRouter);
app.use("/admin/activity-types", activityTypesRouter);
app.use("/admin/children", childrenRouter);
app.use("/admin/history", adminHistoryRouter);
app.use("/public/inscription", publicInscriptionRouter);
app.use("/users", usersRouter);

// 404
app.use((_req, res) => {
  res.status(404).json({ message: "Ressource non trouvée" });
});

// Gestionnaire d'erreurs global (évite de renvoyer des stack traces en prod)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    message: env.NODE_ENV === "production" ? "Erreur interne du serveur" : err.message,
  });
});

app.listen(env.PORT, () => {
  console.log(`OCP Excursions backend running on port ${env.PORT} (${env.NODE_ENV})`);
});


