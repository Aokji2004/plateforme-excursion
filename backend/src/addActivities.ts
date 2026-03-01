import { prisma } from "./db";

async function main() {
  // Trouver l'utilisateur admin
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!admin) {
    console.error("Aucun utilisateur admin trouvé. Veuillez d'abord exécuter le script seed.ts");
    process.exit(1);
  }

  console.log(`Utilisation de l'admin: ${admin.email} (ID: ${admin.id})`);

  // Fonction helper pour obtenir l'URL d'image d'une ville
  const getImageUrl = (city: string): string => {
    // Utiliser des URLs directes vers des images Unsplash réelles
    const cityLower = city.toLowerCase().trim();
    const cityMap: Record<string, string> = {
      marrakech: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop&q=80",
      essaouira: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&q=80",
      agadir: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&q=80",
    };
    return cityMap[cityLower] || "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&q=80";
  };

  // Activité 1: Excursion Famille à Marrakech
  const activity1 = await prisma.excursion.create({
    data: {
      title: "Excursion Marrakech",
      city: "Marrakech",
      hotelName: "Riu Tikida",
      hotelCategory: "4*",
      type: "FAMILY",
      startDate: new Date("2026-02-15"),
      endDate: new Date("2026-02-18"),
      durationDays: 4,
      totalSeats: 50,
      status: "OPEN",
      registrationStartDate: new Date("2026-01-20"),
      registrationEndDate: new Date("2026-02-10"),
      paymentStartDate: new Date("2026-02-01"),
      paymentEndDate: new Date("2026-02-12"),
      waitingListPaymentDate: new Date("2026-02-13"),
      price: 1500,
      childPrice: 750,
      description: "Découvrez la ville ocre avec toute la famille. Visite de la place Jemaa el-Fna, des souks, des jardins de la Ménara et excursion dans l'Atlas.",
      imageUrl: getImageUrl("Marrakech"),
      agentTypes: "EMPLOYEE",
      createdById: admin.id,
      days: {
        create: [
          {
            dayIndex: 1,
            title: "Arrivée et installation",
            description: "Arrivée à l'hôtel, installation et dîner de bienvenue",
          },
          {
            dayIndex: 2,
            title: "Visite de Marrakech",
            description: "Visite de la place Jemaa el-Fna, des souks et des jardins de la Ménara",
          },
          {
            dayIndex: 3,
            title: "Excursion dans l'Atlas",
            description: "Journée d'excursion dans les montagnes de l'Atlas avec déjeuner",
          },
          {
            dayIndex: 4,
            title: "Départ",
            description: "Petit-déjeuner et départ",
          },
        ],
      },
    },
  });

  console.log("✅ Activité 1 créée:", activity1.title);

  // Activité 2: Excursion Couple à Essaouira
  const activity2 = await prisma.excursion.create({
    data: {
      title: "Escapade à Essaouira",
      city: "Essaouira",
      hotelName: "Hotel des Iles",
      hotelCategory: "3*",
      type: "COUPLE",
      startDate: new Date("2026-03-10"),
      endDate: new Date("2026-03-13"),
      durationDays: 4,
      totalSeats: 30,
      status: "OPEN",
      registrationStartDate: new Date("2026-02-15"),
      registrationEndDate: new Date("2026-03-05"),
      paymentStartDate: new Date("2026-02-20"),
      paymentEndDate: new Date("2026-03-07"),
      waitingListPaymentDate: new Date("2026-03-08"),
      price: 1200,
      childPrice: null,
      description: "Romantique escapade à Essaouira, la perle de l'Atlantique. Découvrez la médina classée UNESCO, les plages et l'artisanat local.",
      imageUrl: getImageUrl("Essaouira"),
      agentTypes: "EMPLOYEE",
      createdById: admin.id,
      days: {
        create: [
          {
            dayIndex: 1,
            title: "Arrivée à Essaouira",
            description: "Arrivée et installation à l'hôtel, promenade dans la médina",
          },
          {
            dayIndex: 2,
            title: "Découverte de la ville",
            description: "Visite de la médina, des remparts et du port de pêche",
          },
          {
            dayIndex: 3,
            title: "Plage et détente",
            description: "Journée libre à la plage avec possibilité d'activités nautiques",
          },
          {
            dayIndex: 4,
            title: "Départ",
            description: "Petit-déjeuner et départ",
          },
        ],
      },
    },
  });

  console.log("✅ Activité 2 créée:", activity2.title);

  // Activité 3: Excursion Single à Agadir
  const activity3 = await prisma.excursion.create({
    data: {
      title: "Excursion à Agadir",
      city: "Agadir",
      hotelName: "Club Med Agadir",
      hotelCategory: "5*",
      type: "SINGLE",
      startDate: new Date("2026-04-05"),
      endDate: new Date("2026-04-10"),
      durationDays: 6,
      totalSeats: 40,
      status: "OPEN",
      registrationStartDate: new Date("2026-03-01"),
      registrationEndDate: new Date("2026-03-30"),
      paymentStartDate: new Date("2026-03-10"),
      paymentEndDate: new Date("2026-04-01"),
      waitingListPaymentDate: new Date("2026-04-02"),
      price: 2500,
      childPrice: null,
      description: "Séjour détente à Agadir pour les célibataires. Profitez de la plage, des activités sportives et de la vie nocturne animée.",
      imageUrl: getImageUrl("Agadir"),
      agentTypes: "EMPLOYEE",
      createdById: admin.id,
      days: {
        create: [
          {
            dayIndex: 1,
            title: "Arrivée et installation",
            description: "Arrivée à Agadir, installation à l'hôtel et découverte de la corniche",
          },
          {
            dayIndex: 2,
            title: "Plage et activités",
            description: "Journée à la plage avec activités nautiques (surf, paddle, etc.)",
          },
          {
            dayIndex: 3,
            title: "Visite de la ville",
            description: "Visite de la kasbah, du souk et du musée d'Agadir",
          },
          {
            dayIndex: 4,
            title: "Excursion dans la région",
            description: "Excursion à Taghazout ou dans la vallée du Paradis",
          },
          {
            dayIndex: 5,
            title: "Détente et vie nocturne",
            description: "Journée libre et soirée dans les bars et restaurants d'Agadir",
          },
          {
            dayIndex: 6,
            title: "Départ",
            description: "Petit-déjeuner et départ",
          },
        ],
      },
    },
  });

  console.log("✅ Activité 3 créée:", activity3.title);

  console.log("\n🎉 Toutes les activités ont été créées avec succès!");
  console.log(`\nRésumé:`);
  console.log(`- ${activity1.title} (${activity1.type}) - ${activity1.city}`);
  console.log(`- ${activity2.title} (${activity2.type}) - ${activity2.city}`);
  console.log(`- ${activity3.title} (${activity3.type}) - ${activity3.city}`);
}

main()
  .catch((e) => {
    console.error("Erreur lors de la création des activités:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
