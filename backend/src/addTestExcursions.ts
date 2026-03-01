import { prisma } from "./db";

async function main() {
  try {
    // Récupérer un utilisateur admin
    let admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    // Si pas d'admin, en créer un
    if (!admin) {
      console.log("Création d'un admin de test...");
      admin = await prisma.user.create({
        data: {
          email: "admin@test.com",
          passwordHash: "test", // À ne pas utiliser en production!
          firstName: "Admin",
          lastName: "Test",
          role: "ADMIN",
        },
      });
    }

    console.log("Admin ID:", admin.id);

    // Excursion 1: Marrakech - Randonnée
    const excursion1 = await prisma.excursion.create({
      data: {
        title: "Randonnée en Atlas - Marrakech",
        city: "Marrakech",
        hotelName: "Riad Medina",
        hotelCategory: "4 étoiles",
        type: "FAMILY",
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-05"),
        durationDays: 5,
        totalSeats: 20,
        status: "OPEN",
        price: 1500,
        childPrice: 900,
        description: "Une randonnée exceptionnelle dans les montagnes de l'Atlas avec vue sur Marrakech",
        imageUrl: "/cities/Marrakech.jpg",
        createdById: admin.id,
        days: {
          create: [
            {
              dayIndex: 1,
              title: "Arrivée à Marrakech",
              description: "Accueil et visite de la médina",
            },
            {
              dayIndex: 2,
              title: "Randonnée Jour 1",
              description: "Trek dans l'Atlas",
            },
            {
              dayIndex: 3,
              title: "Randonnée Jour 2",
              description: "Sommet et villages berbères",
            },
            {
              dayIndex: 4,
              title: "Randonnée Jour 3",
              description: "Retour vers Marrakech",
            },
            {
              dayIndex: 5,
              title: "Départ",
              description: "Dernier jour et départ",
            },
          ],
        },
      },
      include: { days: true },
    });

    console.log("✓ Excursion 1 créée:", excursion1.title);

    // Excursion 2: Casablanca - Découverte
    const excursion2 = await prisma.excursion.create({
      data: {
        title: "Découverte de Casablanca et Côte Atlantique",
        city: "Casablanca",
        hotelName: "Hotel Hassan II",
        hotelCategory: "5 étoiles",
        type: "COUPLE",
        startDate: new Date("2026-04-10"),
        endDate: new Date("2026-04-14"),
        durationDays: 5,
        totalSeats: 15,
        status: "OPEN",
        price: 2000,
        childPrice: 1200,
        description: "Un séjour découverte de Casablanca avec la magnifique mosquée Hassan II et les plages de l'Atlantique",
        imageUrl: "/cities/Casablanca.jpg",
        createdById: admin.id,
        days: {
          create: [
            {
              dayIndex: 1,
              title: "Arrivée à Casablanca",
              description: "Accueil et installation à l'hôtel",
            },
            {
              dayIndex: 2,
              title: "Visite de la Mosquée Hassan II",
              description: "Visite du monument emblématique",
            },
            {
              dayIndex: 3,
              title: "Médina et Souks",
              description: "Exploration de la médina traditionnelle",
            },
            {
              dayIndex: 4,
              title: "Plages et Côte Atlantique",
              description: "Détente sur les plages",
            },
            {
              dayIndex: 5,
              title: "Départ",
              description: "Dernier jour et départ",
            },
          ],
        },
      },
      include: { days: true },
    });

    console.log("✓ Excursion 2 créée:", excursion2.title);

    console.log("\n✅ Deux excursions de test ajoutées avec succès!");
  } catch (error) {
    console.error("Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
