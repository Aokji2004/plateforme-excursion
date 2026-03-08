/**
 * Configuration centralisée (côté client).
 * En production : NEXT_PUBLIC_API_BASE_URL (obligatoire), NEXT_PUBLIC_APP_URL (recommandé pour les liens de candidature et QR).
 */

const DEFAULT_API = "http://localhost:4000";

function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (url) return url;
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return DEFAULT_API;
  if (typeof window !== "undefined") {
    const host = window.location?.hostname;
    if (host === "localhost" || host === "127.0.0.1") return DEFAULT_API;
    console.warn("[Config] NEXT_PUBLIC_API_BASE_URL non défini. Les appels API peuvent échouer.");
  }
  return "";
}

/** URL de base du frontend (pour liens de candidature et QR en prod). En déploiement, définir NEXT_PUBLIC_APP_URL (ex. https://votre-app.onrender.com). */
function getSiteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export const API_BASE_URL = getApiBaseUrl();
export const SITE_ORIGIN = getSiteOrigin();
