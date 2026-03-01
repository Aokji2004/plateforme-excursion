import { prisma } from "./db";

async function main() {
  try {
    // 1. Supprimer toutes les excursions existantes
    console.log("Suppression des excursions existantes...");
    await prisma.excursionApplication.deleteMany({});
    await prisma.excursionDay.deleteMany({});
    await prisma.excursionStatsSnapshot.deleteMany({});
    await prisma.selectionHistory.deleteMany({});
    const deleted = await prisma.excursion.deleteMany({});
    console.log(`✓ ${deleted.count} excursions supprimées`);

    // 2. Récupérer l'admin
    let admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!admin) {
      admin = await prisma.user.create({
        data: {
          email: "admin@test.com",
          passwordHash: "test",
          firstName: "Admin",
          lastName: "Test",
          role: "ADMIN",
        },
      });
    }

    console.log(`\nAjout d'excursions pour toutes les villes...\n`);

    // 3. Définir les villes avec leurs descriptions
    const cities = [
      {
        name: "Marrakech",
        type: "FAMILY",
        hotel: "Riad Medina",
        description: "Randonnée en Atlas avec visite de la médina",
        month: 3,
      },
      {
        name: "Casablanca",
        type: "COUPLE",
        hotel: "Hotel Hassan II",
        description: "Découverte de la Mosquée Hassan II et côte atlantique",
        month: 4,
      },
      {
        name: "Agadir",
        type: "SINGLE",
        hotel: "Hotel Al Amir",
        description: "Détente sur les plages d'Agadir",
        month: 5,
      },
      {
        name: "Essaouira",
        type: "FAMILY",
        hotel: "Riad Medina Essaouira",
        description: "Découverte du port et de la médina côtière",
        month: 6,
      },
      {
        name: "Fes",
        type: "COUPLE",
        hotel: "Riad Fes Medina",
        description: "Exploration de la plus grande médina du Maroc",
        month: 7,
      },
      {
        name: "Chefchaouen",
        type: "FAMILY",
        hotel: "Riad Cherifa",
        description: "Visite de la ville bleue et montagnes du Rif",
        month: 3,
      },
      {
        name: "Rabat",
        type: "SINGLE",
        hotel: "Hotel Safir Rabat",
        description: "Découverte de la capitale marocaine",
        month: 4,
      },
      {
        name: "Tanger",
        type: "COUPLE",
        hotel: "Hotel Rif Tangier",
        description: "Vue sur le détroit de Gibraltar et médina historique",
        month: 5,
      },
      {
        name: "Tetouan",
        type: "FAMILY",
        hotel: "Riad Tetouan",
        description: "Médina blanche et architecture andalouse",
        month: 6,
      },
      {
        name: "Khouribga",
        type: "SINGLE",
        hotel: "Hotel Central",
        description: "Découverte des phosphatières et paysages du plateau",
        month: 7,
      },
      {
        name: "Benguerir",
        type: "FAMILY",
        hotel: "Hotel Benguerir",
        description: "Centre vert du Maroc et paysages naturels",
        month: 3,
      },
      {
        name: "Youssoufia",
        type: "COUPLE",
        hotel: "Hotel Youssoufia",
        description: "Patrimoine minier et paysages du centre",
        month: 4,
      },
      {
        name: "Laayoun",
        type: "SINGLE",
        hotel: "Hotel Laayoun",
        description: "Découverte du sud du Maroc et désert",
        month: 8,
      },
      {
        name: "Dakhla",
        type: "FAMILY",
        hotel: "Hotel Dakhla Resort",
        description: "Lagune naturelle et kitesurf en Atlantique",
        month: 9,
      },
      {
        name: "Martil",
        type: "COUPLE",
        hotel: "Hotel Martil Beach",
        description: "Plages méditerranéennes et détente",
        month: 5,
      },
    ];

    // 4. Créer une excursion pour chaque ville
    for (const city of cities) {
      const startDate = new Date(2026, city.month - 1, 1);
      const endDate = new Date(2026, city.month - 1, 5);

      const excursion = await prisma.excursion.create({
        data: {
          title: `Excursion ${city.name} - ${city.type === "FAMILY" ? "Famille" : city.type === "COUPLE" ? "Couple" : "Single"}`,
          city: city.name,
          hotelName: city.hotel,
          hotelCategory: Math.random() > 0.5 ? "4 étoiles" : "5 étoiles",
          type: city.type as "FAMILY" | "COUPLE" | "SINGLE",
          startDate,
          endDate,
          durationDays: 5,
          totalSeats: Math.floor(Math.random() * 15) + 10,
          status: "OPEN",
          price: Math.floor(Math.random() * 1000) + 1000,
          childPrice: Math.floor(Math.random() * 600) + 600,
          description: city.description,
          imageUrl: `/cities/${city.name}.jpg`,
          createdById: admin.id,
          days: {
            create: [
              {
                dayIndex: 1,
                title: "Jour 1 - Arrivée",
                description: `Arrivée à ${city.name} et installation`,
              },
              {
                dayIndex: 2,
                title: "Jour 2 - Exploration",
                description: `Découverte de ${city.name}`,
              },
              {
                dayIndex: 3,
                title: "Jour 3 - Activités",
                description: "Activités et visites locales",
              },
              {
                dayIndex: 4,
                title: "Jour 4 - Détente",
                description: "Repos et exploration personnelle",
              },
              {
                dayIndex: 5,
                title: "Jour 5 - Départ",
                description: `Départ de ${city.name}`,
              },
            ],
          },
        },
      });

      console.log(`✓ ${excursion.title}`);
    }

    console.log(`\n✅ ${cities.length} excursions ajoutées avec succès!`);
  } catch (error) {
    console.error("Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
