/**
 * Exporte toutes les données de la base locale vers un fichier JSON.
 * Utiliser avant déploiement pour restaurer sur Render (voir import-data.ts).
 * Usage: npm run export-data (depuis backend/)
 */

import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db";

const EXPORT_DIR = path.join(__dirname, "../../data-export");

function serialize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) return obj.map(serialize);
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serialize(v);
    }
    return out;
  }
  return obj;
}

async function main() {
  console.log("Export des données en cours...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `export-${timestamp}.json`;
  const filepath = path.join(EXPORT_DIR, filename);

  const [users, children, activityTypes, pointRules, excursions, excursionDays, applications, pointHistory, statsSnapshots, selectionHistory] =
    await Promise.all([
      prisma.user.findMany({ orderBy: { id: "asc" } }),
      prisma.child.findMany({ orderBy: { id: "asc" } }),
      prisma.activityType.findMany({ orderBy: { id: "asc" } }),
      prisma.pointRule.findMany({ orderBy: { id: "asc" } }),
      prisma.excursion.findMany({ orderBy: { id: "asc" } }),
      prisma.excursionDay.findMany({ orderBy: { id: "asc" } }),
      prisma.excursionApplication.findMany({ orderBy: { id: "asc" } }),
      prisma.userPointHistory.findMany({ orderBy: { id: "asc" } }),
      prisma.excursionStatsSnapshot.findMany({ orderBy: { id: "asc" } }),
      prisma.selectionHistory.findMany({ orderBy: { id: "asc" } }),
    ]);

  const data = {
    exportedAt: new Date().toISOString(),
    users,
    children,
    activityTypes,
    pointRules,
    excursions,
    excursionDays,
    applications,
    pointHistory,
    statsSnapshots,
    selectionHistory,
  };

  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
  }
  fs.writeFileSync(filepath, JSON.stringify(serialize(data) as object, null, 2), "utf-8");

  console.log(`Export terminé : ${filepath}`);
  console.log(`  Users: ${users.length}, Excursions: ${excursions.length}, Applications: ${applications.length}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
