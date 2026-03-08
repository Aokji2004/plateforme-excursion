/**
 * Importe les données depuis un fichier JSON (exporté par export-data.ts) dans la base
 * pointée par DATABASE_URL (ex. base Render).
 * Usage: DATABASE_URL="postgresql://..." npm run import-data -- path/to/export-xxx.json
 */

import * as fs from "fs";
import * as path from "path";
import { prisma } from "../db";

type ExportData = {
  exportedAt: string;
  users: Array<Record<string, unknown>>;
  children: Array<Record<string, unknown>>;
  activityTypes: Array<Record<string, unknown>>;
  pointRules: Array<Record<string, unknown>>;
  excursions: Array<Record<string, unknown>>;
  excursionDays: Array<Record<string, unknown>>;
  applications: Array<Record<string, unknown>>;
  pointHistory: Array<Record<string, unknown>>;
  statsSnapshots: Array<Record<string, unknown>>;
  selectionHistory: Array<Record<string, unknown>>;
};

function parseDate(v: unknown): Date | null {
  if (v == null) return null;
  if (typeof v === "string") return new Date(v);
  return null;
}

const INSCRIPTION_STATUSES = ["INSCRIT", "SELECTIONNE", "ATTENTE", "FINAL", "REFUSE"] as const;
function mapInscriptionStatus(v: unknown): (typeof INSCRIPTION_STATUSES)[number] {
  const s = String(v ?? "").toUpperCase();
  if (s === "LISTE_ATTENTE") return "ATTENTE";
  if (s === "ANNULE") return "REFUSE";
  if (INSCRIPTION_STATUSES.includes(s as any)) return s as (typeof INSCRIPTION_STATUSES)[number];
  return "INSCRIT";
}

const SELECTION_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CLOSED"] as const;
function mapSelectionStatus(v: unknown): (typeof SELECTION_STATUSES)[number] {
  const s = String(v ?? "").toUpperCase();
  if (s === "DONE") return "COMPLETED";
  if (SELECTION_STATUSES.includes(s as any)) return s as (typeof SELECTION_STATUSES)[number];
  return "NOT_STARTED";
}

const SELECTION_ACTIONS = [
  "SELECTION_STARTED", "PARTICIPANT_SELECTED", "PARTICIPANT_PROMOTED_FROM_WAITING",
  "PARTICIPANT_REFUSED", "PAYMENT_CONFIRMED", "SELECTION_CLOSED", "RESET_SELECTION", "PROMOTE_FROM_WAITING",
] as const;
function mapSelectionAction(v: unknown): (typeof SELECTION_ACTIONS)[number] {
  const s = String(v ?? "").toUpperCase();
  if (s === "START_SELECTION") return "SELECTION_STARTED";
  if (s === "CLOSE") return "SELECTION_CLOSED";
  if (s === "PROMOTE") return "PARTICIPANT_SELECTED";
  if (s === "DEMOTE") return "PARTICIPANT_REFUSED";
  if (s === "CONFIRM") return "PAYMENT_CONFIRMED";
  if (SELECTION_ACTIONS.includes(s as any)) return s as (typeof SELECTION_ACTIONS)[number];
  return "SELECTION_STARTED";
}

async function main() {
  const arg = process.argv[2];
  const exportDir = path.join(__dirname, "../../data-export");
  let filepath: string;
  if (arg) {
    filepath = path.isAbsolute(arg) ? arg : path.join(process.cwd(), arg);
  } else {
    const files = fs.readdirSync(exportDir).filter((f) => f.startsWith("export-") && f.endsWith(".json"));
    if (files.length === 0) {
      console.error("Aucun fichier d'export trouvé dans data-export/. Indiquez le chemin du fichier.");
      process.exit(1);
    }
    files.sort().reverse();
    filepath = path.join(exportDir, files[0]);
  }
  if (!fs.existsSync(filepath)) {
    console.error("Fichier introuvable:", filepath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(filepath, "utf-8")) as ExportData;
  console.log("Import depuis", filepath, "(", raw.exportedAt, ")");

  const userMap: Record<number, number> = {};
  const activityTypeMap: Record<number, number> = {};
  const excursionMap: Record<number, number> = {};

  for (const u of raw.users) {
    const created = await prisma.user.create({
      data: {
        email: String(u.email),
        passwordHash: String(u.passwordHash),
        firstName: String(u.firstName),
        lastName: String(u.lastName),
        matricule: u.matricule != null ? String(u.matricule) : null,
        role: (u.role as "ADMIN" | "EMPLOYEE") || "EMPLOYEE",
        points: Number(u.points) || 0,
        maritalStatus: u.maritalStatus != null ? (u.maritalStatus as "SINGLE" | "MARRIED" | "DIVORCED" | "WIDOWED") : null,
        spouse: u.spouse != null ? String(u.spouse) : null,
        spouseEmail: u.spouseEmail != null ? String(u.spouseEmail) : null,
        profileIncomplete: Boolean(u.profileIncomplete),
      },
    });
    userMap[Number(u.id)] = created.id;
  }
  console.log("  Users:", raw.users.length);

  for (const c of raw.children) {
    const newParentId = userMap[Number(c.parentId)];
    if (newParentId == null) continue;
    await prisma.child.create({
      data: {
        firstName: String(c.firstName),
        lastName: String(c.lastName),
        dateOfBirth: parseDate(c.dateOfBirth) || new Date(),
        gender: (c.gender as "MALE" | "FEMALE") || "MALE",
        parentId: newParentId,
      },
    });
  }
  console.log("  Children:", raw.children.length);

  for (const a of raw.activityTypes) {
    const created = await prisma.activityType.create({
      data: {
        title: String(a.title),
        beneficiary: String(a.beneficiary),
        points: Number(a.points),
        pointsPerChild: Number(a.pointsPerChild),
        pointsConjoint: Number(a.pointsConjoint) || 0,
      },
    });
    activityTypeMap[Number(a.id)] = created.id;
  }
  console.log("  ActivityTypes:", raw.activityTypes.length);

  for (const p of raw.pointRules) {
    await prisma.pointRule.create({
      data: {
        name: String(p.name),
        description: p.description != null ? String(p.description) : null,
        weight: Number(p.weight) ?? 1,
        isActive: Boolean(p.isActive),
      },
    });
  }
  console.log("  PointRules:", raw.pointRules.length);

  for (const e of raw.excursions) {
    const newCreatedById = userMap[Number(e.createdById)];
    if (newCreatedById == null) continue;
    const created = await prisma.excursion.create({
      data: {
        title: String(e.title),
        city: String(e.city),
        hotelName: String(e.hotelName),
        hotelCategory: String(e.hotelCategory),
        type: (e.type as "FAMILY" | "SINGLE" | "COUPLE") || "SINGLE",
        startDate: parseDate(e.startDate) || new Date(),
        endDate: parseDate(e.endDate) || new Date(),
        durationDays: Number(e.durationDays),
        totalSeats: Number(e.totalSeats),
        status: (e.status === "CLOSED" || e.status === "FULL" ? e.status : "OPEN") as "OPEN" | "FULL" | "CLOSED",
        registrationStartDate: parseDate(e.registrationStartDate),
        registrationEndDate: parseDate(e.registrationEndDate),
        paymentStartDate: parseDate(e.paymentStartDate),
        paymentEndDate: parseDate(e.paymentEndDate),
        waitingListPaymentDate: parseDate(e.waitingListPaymentDate),
        price: e.price != null ? Number(e.price) : null,
        childPrice: e.childPrice != null ? Number(e.childPrice) : null,
        description: e.description != null ? String(e.description) : null,
        imageUrl: e.imageUrl != null ? String(e.imageUrl) : null,
        agentTypes: e.agentTypes != null ? String(e.agentTypes) : null,
        activityTypeId: e.activityTypeId != null ? activityTypeMap[Number(e.activityTypeId)] ?? null : null,
        selectionStatus: mapSelectionStatus(e.selectionStatus),
        selectionMaxPlaces: e.selectionMaxPlaces != null ? Number(e.selectionMaxPlaces) : null,
        paymentDeadline: parseDate(e.paymentDeadline),
        pointsCreditedAt: parseDate(e.pointsCreditedAt),
        inscriptionToken: e.inscriptionToken != null ? String(e.inscriptionToken) : null,
        inscriptionLinkValidFrom: parseDate(e.inscriptionLinkValidFrom),
        inscriptionLinkValidUntil: parseDate(e.inscriptionLinkValidUntil),
        externalFormUrl: e.externalFormUrl != null ? String(e.externalFormUrl) : null,
        inscriptionFormTitle: e.inscriptionFormTitle != null ? String(e.inscriptionFormTitle) : null,
        inscriptionFormDescription: e.inscriptionFormDescription != null ? String(e.inscriptionFormDescription) : null,
        createdById: newCreatedById,
      },
    });
    excursionMap[Number(e.id)] = created.id;
  }
  console.log("  Excursions:", raw.excursions.length);

  for (const d of raw.excursionDays) {
    const newExcursionId = excursionMap[Number(d.excursionId)];
    if (newExcursionId == null) continue;
    await prisma.excursionDay.create({
      data: {
        excursionId: newExcursionId,
        dayIndex: Number(d.dayIndex),
        title: String(d.title),
        description: String(d.description),
      },
    });
  }
  console.log("  ExcursionDays:", raw.excursionDays.length);

  for (const app of raw.applications) {
    const newUserId = userMap[Number(app.userId)];
    const newExcursionId = excursionMap[Number(app.excursionId)];
    if (newUserId == null || newExcursionId == null) continue;
    await prisma.excursionApplication.create({
      data: {
        userId: newUserId,
        excursionId: newExcursionId,
        status: (app.status as "PENDING" | "APPROVED" | "REJECTED") || "PENDING",
        inscriptionStatus: mapInscriptionStatus(app.inscriptionStatus),
        originalInscriptionStatus: mapInscriptionStatus(app.originalInscriptionStatus),
        computedScore: app.computedScore != null ? Number(app.computedScore) : null,
        selectionOrder: app.selectionOrder != null ? Number(app.selectionOrder) : null,
        paymentConfirmed: Boolean(app.paymentConfirmed),
        paymentConfirmedDate: parseDate(app.paymentConfirmedDate),
        inscriptionFirstName: app.inscriptionFirstName != null ? String(app.inscriptionFirstName) : null,
        inscriptionLastName: app.inscriptionLastName != null ? String(app.inscriptionLastName) : null,
        inscriptionAddress: app.inscriptionAddress != null ? String(app.inscriptionAddress) : null,
        inscriptionPhone: app.inscriptionPhone != null ? String(app.inscriptionPhone) : null,
      },
    });
  }
  console.log("  Applications:", raw.applications.length);

  for (const h of raw.pointHistory) {
    const newUserId = userMap[Number(h.userId)];
    const newCreatedById = userMap[Number(h.createdById)];
    if (newUserId == null || newCreatedById == null) continue;
    await prisma.userPointHistory.create({
      data: {
        userId: newUserId,
        delta: Number(h.delta),
        reason: h.reason != null ? String(h.reason) : null,
        createdById: newCreatedById,
      },
    });
  }
  console.log("  UserPointHistory:", raw.pointHistory.length);

  for (const s of raw.statsSnapshots) {
    const newExcursionId = excursionMap[Number(s.excursionId)];
    if (newExcursionId == null) continue;
    await prisma.excursionStatsSnapshot.create({
      data: {
        excursionId: newExcursionId,
        totalApplications: Number(s.totalApplications),
        approvedCount: Number(s.approvedCount),
        waitingListCount: Number(s.waitingListCount),
      },
    });
  }
  console.log("  ExcursionStatsSnapshots:", raw.statsSnapshots.length);

  for (const sh of raw.selectionHistory) {
    const newExcursionId = excursionMap[Number(sh.excursionId)];
    if (newExcursionId == null) continue;
    await prisma.selectionHistory.create({
      data: {
        excursionId: newExcursionId,
        action: mapSelectionAction(sh.action),
        applicationId: null, // non recréé (IDs différents après import)
        participantName: String(sh.participantName),
        participantEmail: String(sh.participantEmail),
        previousStatus: sh.previousStatus != null ? mapInscriptionStatus(sh.previousStatus) : null,
        newStatus: sh.newStatus != null ? mapInscriptionStatus(sh.newStatus) : null,
        reason: sh.reason != null ? String(sh.reason) : null,
        createdByAdminId: sh.createdByAdminId != null ? userMap[Number(sh.createdByAdminId)] ?? null : null,
      },
    });
  }
  console.log("  SelectionHistory:", raw.selectionHistory.length);

  console.log("Import terminé.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
