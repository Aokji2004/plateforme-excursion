import { prisma } from "./db";

const boyNames = ["Ahmed", "Ali", "Hassan", "Ibrahim", "Mohamed", "Karim", "Samir", "Youssef", "Tarik", "Rashid", "Omar", "Bilal", "Reda", "Adil", "Hamza", "Majid", "Nabil", "Walid", "Zaki", "Amin"];
const girlNames = ["Fatima", "Leila", "Amina", "Zahra", "Noor", "Layla", "Hana", "Sara", "Yasmine", "Rania", "Salma", "Nadia", "Dina", "Hiba", "Amira", "Layali", "Soraya", "Jalila", "Khadija", "Munira"];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function getRandomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateRandomDate(startYear: number, endYear: number): Date {
  return new Date(
    getRandomBetween(startYear, endYear),
    getRandomBetween(0, 11),
    getRandomBetween(1, 28)
  );
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) {
    console.error("Aucun admin. Exécutez npm run seed.");
    process.exit(1);
  }

  // 1) Plus d'enfants pour les mariés qui en ont peu
  const married = await prisma.user.findMany({
    where: { maritalStatus: "MARRIED", role: "EMPLOYEE" },
    include: { children: true },
  });
  let addedChildren = 0;
  for (const u of married) {
    if (u.children.length >= 2) continue;
    const toAdd = 2 - u.children.length;
    for (let i = 0; i < toAdd; i++) {
      const isGirl = Math.random() < 0.5;
      await prisma.child.create({
        data: {
          firstName: isGirl ? getRandomElement(girlNames) : getRandomElement(boyNames),
          lastName: u.lastName,
          dateOfBirth: generateRandomDate(2006, 2022),
          gender: isGirl ? "FEMALE" : "MALE",
          parentId: u.id,
        },
      });
      addedChildren++;
    }
  }
  console.log("✅ Enfants ajoutés aux mariés:", addedChildren);

  // 2) Nouvelles activités (Fes, Rabat, Tanger) si pas déjà présentes
  const citiesToAdd = [
    { city: "Fes", title: "Séjour Fès", type: "FAMILY" as const, seats: 35, days: 4 },
    { city: "Rabat", title: "Escapade Rabat", type: "COUPLE" as const, seats: 25, days: 3 },
    { city: "Tanger", title: "Week-end Tanger", type: "SINGLE" as const, seats: 30, days: 3 },
  ];

  for (const { city, title, type, seats, days } of citiesToAdd) {
    const exists = await prisma.excursion.findFirst({
      where: { city, title },
    });
    if (exists) {
      console.log("⊘ Activité déjà existante:", title);
      continue;
    }
    const start = new Date("2026-05-01");
    start.setDate(start.getDate() + getRandomBetween(0, 60));
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    await prisma.excursion.create({
      data: {
        title,
        city,
        hotelName: `Hotel ${city}`,
        hotelCategory: "4*",
        type,
        startDate: start,
        endDate: end,
        durationDays: days,
        totalSeats: seats,
        status: "OPEN",
        registrationStartDate: start,
        registrationEndDate: end,
        price: 1200 + getRandomBetween(0, 800),
        childPrice: type === "FAMILY" ? 600 : null,
        description: `Découverte de ${city}.`,
        createdById: admin.id,
        days: {
          create: Array.from({ length: days }, (_, i) => ({
            dayIndex: i + 1,
            title: `Jour ${i + 1}`,
            description: `Programme jour ${i + 1} à ${city}.`,
          })),
        },
      },
    });
    console.log("✅ Activité créée:", title);
  }

  // 3) Inscriptions sur les nouvelles activités (employés aléatoires)
  const newExcursions = await prisma.excursion.findMany({
    where: {
      city: { in: ["Fes", "Rabat", "Tanger"] },
      status: "OPEN",
    },
  });
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true },
  });

  let addedInscriptions = 0;
  for (const ex of newExcursions) {
    const count = getRandomBetween(5, Math.min(20, ex.totalSeats));
    const shuffled = [...employees].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count && i < shuffled.length; i++) {
      const userId = shuffled[i].id;
      const existing = await prisma.excursionApplication.findUnique({
        where: { userId_excursionId: { userId, excursionId: ex.id } },
      });
      if (!existing) {
        await prisma.excursionApplication.create({
          data: {
            userId,
            excursionId: ex.id,
            status: "PENDING",
            inscriptionStatus: "INSCRIT",
            originalInscriptionStatus: "INSCRIT",
          },
        });
        addedInscriptions++;
      }
    }
    console.log("✅ Inscriptions pour", ex.title, ":", count, "candidats");
  }

  console.log("\n🎉 Données ajoutées. Enfants:", addedChildren, "| Nouvelles activités:", citiesToAdd.length, "| Inscriptions:", addedInscriptions);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
