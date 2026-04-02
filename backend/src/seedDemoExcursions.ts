import { prisma } from "./db";
import type { ExcursionType } from "../generated/prisma/enums";

const CITIES: Array<{
  name: string;
  type: ExcursionType;
  hotel: string;
  description: string;
  month: number;
}> = [
  { name: "Marrakech", type: "FAMILY", hotel: "Riad Medina", description: "Randonnée en Atlas avec visite de la médina", month: 3 },
  { name: "Casablanca", type: "COUPLE", hotel: "Hotel Hassan II", description: "Mosquée Hassan II et côte atlantique", month: 4 },
  { name: "Agadir", type: "SINGLE", hotel: "Hotel Al Amir", description: "Détente sur les plages d'Agadir", month: 5 },
  { name: "Essaouira", type: "FAMILY", hotel: "Riad Medina Essaouira", description: "Port et médina côtière", month: 6 },
  { name: "Fes", type: "COUPLE", hotel: "Riad Fes Medina", description: "Plus grande médina du Maroc", month: 7 },
  { name: "Chefchaouen", type: "FAMILY", hotel: "Riad Cherifa", description: "Ville bleue et montagnes du Rif", month: 3 },
  { name: "Rabat", type: "SINGLE", hotel: "Hotel Safir Rabat", description: "Capitale du Maroc", month: 4 },
  { name: "Tanger", type: "COUPLE", hotel: "Hotel Rif Tangier", description: "Détroit de Gibraltar et médina", month: 5 },
  { name: "Tetouan", type: "FAMILY", hotel: "Riad Tetouan", description: "Médina blanche et architecture andalouse", month: 6 },
  { name: "Khouribga", type: "SINGLE", hotel: "Hotel Central", description: "Phosphatières et plateau", month: 7 },
  { name: "Benguerir", type: "FAMILY", hotel: "Hotel Benguerir", description: "Centre vert et paysages naturels", month: 3 },
  { name: "Youssoufia", type: "COUPLE", hotel: "Hotel Youssoufia", description: "Patrimoine minier et centre du Maroc", month: 4 },
  { name: "Laayoun", type: "SINGLE", hotel: "Hotel Laayoun", description: "Sud du Maroc", month: 8 },
  { name: "Dakhla", type: "FAMILY", hotel: "Hotel Dakhla Resort", description: "Lagune et Atlantique", month: 9 },
  { name: "Martil", type: "COUPLE", hotel: "Hotel Martil Beach", description: "Plages méditerranéennes", month: 5 },
];

function imageForCity(city: string): string {
  const key = city.toLowerCase().trim();
  const map: Record<string, string> = {
    marrakech: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop&q=80",
    essaouira: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&q=80",
    agadir: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&q=80",
  };
  return map[key] || "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&q=80";
}

function typeLabel(t: ExcursionType): string {
  if (t === "FAMILY") return "Famille";
  if (t === "COUPLE") return "Couple";
  return "Single";
}

/**
 * Si aucune excursion en base : crée un jeu de démo (15 villes), lié aux types d’activité (bénéficiaire).
 * Sans effet si au moins une excursion existe déjà.
 */
export async function ensureDemoExcursions(): Promise<number> {
  const existing = await prisma.excursion.count();
  if (existing > 0) {
    console.log("Excursions déjà présentes :", existing, "(aucune création démo).");
    return 0;
  }

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.warn("Aucun admin : impossible de créer les excursions démo. Exécutez d’abord npm run seed.");
    return 0;
  }

  const types = await prisma.activityType.findMany({ orderBy: { id: "asc" } });
  const byBeneficiary: Record<string, number> = {};
  for (const t of types) {
    const b = String(t.beneficiary).toUpperCase();
    if (byBeneficiary[b] === undefined) byBeneficiary[b] = t.id;
  }

  let created = 0;
  for (const city of CITIES) {
    const ben = city.type;
    const activityTypeId = byBeneficiary[ben] ?? null;

    const startDate = new Date(2026, city.month - 1, 8);
    const endDate = new Date(2026, city.month - 1, 12);
    const regStart = new Date(startDate);
    regStart.setDate(regStart.getDate() - 45);
    const regEnd = new Date(startDate);
    regEnd.setDate(regEnd.getDate() - 5);
    const payStart = new Date(startDate);
    payStart.setDate(payStart.getDate() - 14);
    const payEnd = new Date(startDate);
    payEnd.setDate(payEnd.getDate() - 2);

    await prisma.excursion.create({
      data: {
        title: `Excursion ${city.name} — ${typeLabel(city.type)}`,
        city: city.name,
        hotelName: city.hotel,
        hotelCategory: "4*",
        type: city.type,
        startDate,
        endDate,
        durationDays: 5,
        totalSeats: 20 + (created % 11),
        status: "OPEN",
        registrationStartDate: regStart,
        registrationEndDate: regEnd,
        paymentStartDate: payStart,
        paymentEndDate: payEnd,
        waitingListPaymentDate: new Date(startDate.getTime() - 86400000),
        price: 1200 + created * 50,
        childPrice: 600 + created * 25,
        description: city.description,
        imageUrl: imageForCity(city.name),
        agentTypes: "EMPLOYEE",
        activityTypeId,
        createdById: admin.id,
        days: {
          create: [
            { dayIndex: 1, title: "Jour 1 — Arrivée", description: `Arrivée à ${city.name} et installation` },
            { dayIndex: 2, title: "Jour 2 — Découverte", description: `Visites et découverte locale` },
            { dayIndex: 3, title: "Jour 3 — Activités", description: "Activités et temps libre" },
            { dayIndex: 4, title: "Jour 4 — Détente", description: "Repos et exploration" },
            { dayIndex: 5, title: "Jour 5 — Départ", description: `Départ de ${city.name}` },
          ],
        },
      },
    });
    created++;
  }

  console.log(`Excursions de démo créées : ${created} (villes variées, types Famille / Couple / Single).`);
  return created;
}
