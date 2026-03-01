import { prisma } from "./db";

const boyNames = [
  "Ahmed",
  "Ali",
  "Hassan",
  "Ibrahim",
  "Mohamed",
  "Karim",
  "Samir",
  "Youssef",
  "Tarik",
  "Rashid",
];

const girlNames = [
  "Fatima",
  "Leila",
  "Amina",
  "Zahra",
  "Noor",
  "Layla",
  "Hana",
  "Sara",
  "Yasmine",
  "Rania",
];

const lastNames = [
  "Benali",
  "Bennani",
  "Bouchard",
  "Cohen",
  "Dupont",
  "Garcia",
  "Hassan",
  "Ibrahim",
  "Karim",
  "Laurent",
  "Malik",
  "Nathan",
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomDate(startYear: number, endYear: number): Date {
  const year = getRandomBetween(startYear, endYear);
  const month = getRandomBetween(0, 11);
  const day = getRandomBetween(1, 28);
  return new Date(year, month, day);
}

async function fillChildrenData() {
  try {
    const users = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
    });

    console.log(`Ajout des enfants pour ${users.length} utilisateurs...\n`);

    let totalChildrenAdded = 0;

    for (const user of users) {
      // 60% de probabilité d'avoir des enfants
      if (Math.random() < 0.6) {
        // Nombre aléatoire d'enfants (1-4)
        const numberOfChildren = getRandomBetween(1, 4);

        for (let i = 0; i < numberOfChildren; i++) {
          // 50% chance garçon, 50% chance fille
          const isGirl = Math.random() < 0.5;
          const firstName = isGirl
            ? getRandomElement(girlNames)
            : getRandomElement(boyNames);
          const lastName = getRandomElement(lastNames);
          const gender = isGirl ? "FEMALE" : "MALE";
          const dateOfBirth = generateRandomDate(2005, 2022);

          await prisma.child.create({
            data: {
              firstName,
              lastName,
              gender: gender as any,
              dateOfBirth,
              parentId: user.id,
            },
          });

          totalChildrenAdded++;
          console.log(
            `  ✓ ${firstName} ${lastName} (${gender === "MALE" ? "♂" : "♀"}) - Né(e) le ${dateOfBirth.toLocaleDateString("fr-FR")} - Parent: ${user.firstName} ${user.lastName}`
          );
        }
      }
    }

    console.log(`\n✅ Ajout des enfants terminé!`);
    console.log(`   ${totalChildrenAdded} enfants ajoutés au total`);
  } catch (error) {
    console.error("Erreur lors de l'ajout des enfants:", error);
  }
}

fillChildrenData()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
