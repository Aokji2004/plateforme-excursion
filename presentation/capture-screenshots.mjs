/**
 * Génère des captures d'écran réelles de la plateforme pour la présentation HTML.
 *
 * Prérequis :
 *   1. Backend + frontend démarrés (à la racine du projet : npm run dev)
 *   2. Base PostgreSQL avec au moins un compte admin (npm run seed dans backend)
 *
 * Usage :
 *   cd presentation
 *   npm install
 *   npx playwright install chromium
 *   npm run capture
 *
 * Variables optionnelles :
 *   BASE_URL=http://localhost:3000
 *   API_URL=http://localhost:4000
 *   ADMIN_EMAIL=mohamed.msaadi@ocp.ma
 *   ADMIN_PASSWORD=popap.2004
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "screenshots");

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mohamed.msaadi@ocp.ma";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "popap.2004";

async function shot(page, name) {
  const path = join(OUT, name);
  await page.screenshot({ path, fullPage: true });
  console.log("OK", path);
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/admin|\/employee/, { timeout: 30000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "01-login.png");

    await login(page);
    await page.waitForTimeout(800);
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "02-dashboard-admin.png");

    await page.goto(`${BASE_URL}/admin/activities`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "03-activites.png");

    const firstExcursion = await page.evaluate(async (api) => {
      const t = localStorage.getItem("ocp_token");
      if (!t) return null;
      const r = await fetch(`${api}/excursions`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!r.ok) return null;
      const list = await r.json();
      if (!Array.isArray(list) || list.length === 0) return null;
      const ex = list[0];
      return { id: ex.id, token: ex.inscriptionToken || null };
    }, API_URL);

    if (firstExcursion?.id) {
      await page.evaluate(
        async ({ api, excursionId }) => {
          const t = localStorage.getItem("ocp_token");
          if (!t) return;
          await fetch(`${api}/excursions/${excursionId}/generate-inscription-link`, {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          });
        },
        { api: API_URL, excursionId: firstExcursion.id }
      );

      await page.goto(`${BASE_URL}/admin/activities/${firstExcursion.id}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await shot(page, "04-fiche-activite.png");

      await page.goto(`${BASE_URL}/admin/activities/selection/${firstExcursion.id}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await shot(page, "05-selection.png");
    } else {
      console.warn("Aucune activité en base : sauts fiche activité / sélection.");
    }

    await page.goto(`${BASE_URL}/admin/applications`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "06-inscriptions.png");

    await page.goto(`${BASE_URL}/admin/activityTypes`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "07-types-activite.png");

    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "08-utilisateurs.png");

    await page.goto(`${BASE_URL}/admin/family-status`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "09-situation-familiale.png");

    await page.goto(`${BASE_URL}/admin/children`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "10-enfants.png");

    await page.goto(`${BASE_URL}/admin/history`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "11-historique.png");

    const token =
      firstExcursion?.token ||
      (await page.evaluate(async (api) => {
        const t = localStorage.getItem("ocp_token");
        if (!t) return null;
        try {
          const r = await fetch(`${api}/excursions`, {
            headers: { Authorization: `Bearer ${t}` },
          });
          if (!r.ok) return null;
          const list = await r.json();
          const ex = Array.isArray(list) ? list.find((x) => x.inscriptionToken) : null;
          return ex?.inscriptionToken || null;
        } catch {
          return null;
        }
      }, API_URL));

    if (token) {
      await page.goto(`${BASE_URL}/candidater/${token}`, { waitUntil: "networkidle", timeout: 60000 });
      await shot(page, "12-candidature-publique.png");
    } else {
      console.warn("Aucun inscriptionToken sur une activité : saut capture candidature publique.");
    }

    // Même session JWT : la page employé n’impose pas le rôle (vue « collaborateur »).
    await page.goto(`${BASE_URL}/employee/dashboard`, { waitUntil: "networkidle", timeout: 60000 });
    await shot(page, "13-dashboard-employe.png");
  } finally {
    await browser.close();
  }

  await writeFile(
    join(OUT, "README.txt"),
    `Captures générées le ${new Date().toISOString()}\nOuvrez ../index.html dans le navigateur.\n`,
    "utf8"
  );
  console.log("\nTerminé. Ouvrez presentation/index.html dans votre navigateur.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
