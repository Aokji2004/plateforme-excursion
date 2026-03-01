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

async function addChildrenToMarriedUsers() {
  try {
    // Récupérer tous les utilisateurs mariés
    const marriedUsers = await prisma.user.findMany({
      where: {
        maritalStatus: "MARRIED",
        role: "EMPLOYEE",
      },
      include: {
        children: true,
      },
    });

    console.log(`Trouvé ${marriedUsers.length} employés mariés\n`);

    let totalChildrenAdded = 0;

    for (const user of marriedUsers) {
      // Si l'utilisateur marié n'a pas d'enfants, en ajouter 1-3
      if (user.children.length === 0) {
        const numberOfChildren = getRandomBetween(1, 3);

        for (let i = 0; i < numberOfChildren; i++) {
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
            `  ✓ Ajouté: ${firstName} ${lastName} (${gender === "MALE" ? "♂" : "♀"}) - Né(e) le ${dateOfBirth.toLocaleDateString("fr-FR")} - Parent: ${user.firstName} ${user.lastName}`
          );
        }
      } else {
        console.log(
          `  ⊘ ${user.firstName} ${user.lastName} a déjà ${user.children.length} enfant(s) - Pas d'ajout`
        );
      }
    }

    console.log(`\n✅ Ajout des enfants aux employés mariés terminé!`);
    console.log(`   ${totalChildrenAdded} enfants ajoutés au total`);
  } catch (error) {
    console.error("Erreur lors de l'ajout des enfants:", error);
  }
}

addChildrenToMarriedUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
