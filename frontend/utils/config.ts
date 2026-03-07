/**
 * Configuration centralisée (côté client).
 * En production, NEXT_PUBLIC_API_BASE_URL doit être défini (voir .env.example).
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

export const API_BASE_URL = getApiBaseUrl();
