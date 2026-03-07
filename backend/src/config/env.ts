/**
 * Validation des variables d'environnement au démarrage.
 * En production, les variables obligatoires doivent être définies.
 */

const isProd = process.env.NODE_ENV === "production";

function getEnv(name: string, requiredInProd = true): string | undefined {
  const value = process.env[name];
  if (requiredInProd && isProd && (!value || value.trim() === "")) {
    throw new Error(
      `[Config] Variable d'environnement requise en production : ${name}. Vérifiez votre fichier .env ou la configuration de l'hébergeur.`
    );
  }
  return value?.trim() || undefined;
}

export function validateEnv(): void {
  const errors: string[] = [];

  const databaseUrl = getEnv("DATABASE_URL");
  if (!databaseUrl && isProd) {
    errors.push("DATABASE_URL est obligatoire en production.");
  }
  if (databaseUrl && !databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    errors.push("DATABASE_URL doit être une URL PostgreSQL (postgresql://...).");
  }

  const jwtSecret = getEnv("JWT_SECRET");
  if (!jwtSecret && isProd) {
    errors.push("JWT_SECRET est obligatoire en production.");
  }
  if (jwtSecret && jwtSecret.length < 32 && isProd) {
    errors.push("JWT_SECRET doit faire au moins 32 caractères en production (générer avec : node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\").");
  }

  if (errors.length > 0) {
    throw new Error(`[Config] Erreurs de configuration :\n${errors.join("\n")}`);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL?.trim(),
  JWT_SECRET: process.env.JWT_SECRET?.trim(),
  CORS_ORIGIN: process.env.CORS_ORIGIN?.trim() || undefined,
};
