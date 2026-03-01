import { prisma } from "./db";

// Données de situation familiale réalistes
const maritalStatuses = ["SINGLE", "MARRIED", "DIVORCED", "WIDOWED"];
const firstNames = [
  "Ahmed",
  "Fatima",
  "Mohamed",
  "Leila",
  "Hassan",
  "Amina",
  "Ali",
  "Zahra",
  "Ibrahim",
  "Noor",
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

function generateSpouseName(): string {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

function generateSpouseEmail(spouseName: string): string {
  const [first, last] = spouseName.split(" ");
  const domain = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.fr"];
  return `${first.toLowerCase()}.${last.toLowerCase()}@${getRandomElement(domain)}`;
}

async function fillFamilyInfo() {
  try {
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany();

    console.log(`Remplissage des informations familiales pour ${users.length} utilisateurs...`);

    for (const user of users) {
      // Ne pas modifier l'admin
      if (user.role === "ADMIN") {
        continue;
      }

      // Générer une situation familiale aléatoire
      const maritalStatus = getRandomElement(maritalStatuses);
      let spouse = null;
      let spouseEmail = null;

      // Si marié, générer un conjoint
      if (maritalStatus === "MARRIED") {
        spouse = generateSpouseName();
        spouseEmail = generateSpouseEmail(spouse);
      }

      // Mettre à jour l'utilisateur
      await prisma.user.update({
        where: { id: user.id },
        data: {
          maritalStatus: maritalStatus as any,
          spouse,
          spouseEmail,
        },
      });

      console.log(
        `✓ ${user.firstName} ${user.lastName} - ${maritalStatus}${
          spouse ? ` (Conjoint: ${spouse})` : ""
        }`
      );
    }

    console.log("✅ Remplissage des informations familiales terminé!");
  } catch (error) {
    console.error("Erreur lors du remplissage:", error);
  }
}

fillFamilyInfo()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
