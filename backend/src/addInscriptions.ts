import bcrypt from "bcryptjs";
import { prisma } from "./db";

// Liste de noms marocains réalistes
const firstNames = [
  "Ahmed", "Mohamed", "Fatima", "Yasmine", "Hassan", "Laila", "Karim", "Mariam",
  "Omar", "Aisha", "Ibrahim", "Noor", "Samir", "Leila", "Tariq", "Samira",
  "Khalil", "Zainab", "Rashid", "Hana", "Ali", "Rania", "Jamal", "Soraya",
  "Hamza", "Amira", "Youssef", "Salma", "Nabil", "Dina", "Adil", "Hiba",
  "Mustafa", "Nadia", "Bilal", "Layal", "Majid", "Safiya", "Saïd", "Jalila",
  "Fouad", "Khadija", "Aziz", "Munira", "Hakim", "Salwa", "Amin", "Habiba",
  "Walid", "Layali", "Zaki", "Farida", "Hicham", "Hanina", "Reda", "Yasmin"
];

const lastNames = [
  "Alaoui", "Bennani", "Chakri", "Dalal", "Elouafi", "Fakhri", "Gharbi", "Hajji",
  "Ighcheni", "Jamali", "Kabbaj", "Lakhdar", "Makhlouf", "Nadir", "Ouali", "Patel",
  "Qadi", "Rafi", "Saïdi", "Tahar", "Usman", "Vanini", "Wadi", "Xini",
  "Yousfi", "Zarkaoui", "Bennani", "Cherkaoui", "Daoui", "El Fassi", "Fahmi", "Ghali"
];

const domains = ["gmail.com", "outlook.com", "yahoo.fr", "hotmail.fr", "ocp.ma", "email.com"];

function generateEmail(firstName: string, lastName: string, index: number): string {
  const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  if (index === 0) {
    return `${base}@${domain}`;
  }
  return `${base}${index}@${domain}`;
}

function generateMatricule(): string {
  const prefix = ["E", "M", "A", "T"];
  const p = prefix[Math.floor(Math.random() * prefix.length)];
  const year = Math.floor(Math.random() * 9) + 2020; // 2020-2028
  const number = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `${p}${year}${number}`;
}

async function main() {
  try {
    // Trouver l'excursion Essaouira
    const excursion = await prisma.excursion.findFirst({
      where: { city: "Essaouira" },
    });

    if (!excursion) {
      console.error("❌ Excursion Essaouira non trouvée!");
      return;
    }

    console.log(`✓ Excursion trouvée: ${excursion.title} (ID: ${excursion.id})`);
    console.log(`📍 Ville: ${excursion.city}`);
    console.log(`👥 Places totales: ${excursion.totalSeats}`);

    // Compter les inscriptions existantes
    const existingCount = await prisma.excursionApplication.count({
      where: { excursionId: excursion.id },
    });
    console.log(`📝 Inscriptions existantes: ${existingCount}`);

    // Créer 60 utilisateurs et leurs inscriptions
    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < 60; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const email = generateEmail(firstName, lastName, i);
      const matricule = generateMatricule();

      try {
        // Vérifier si l'utilisateur existe déjà
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          // Créer l'utilisateur
          user = await prisma.user.create({
            data: {
              email,
              passwordHash: await bcrypt.hash("Password123!", 10),
              firstName,
              lastName,
              matricule,
              role: "EMPLOYEE",
              points: Math.floor(Math.random() * 500), // 0-500 points aléatoires
            },
          });
        }

        // Vérifier si l'inscription existe déjà
        const existingApp = await prisma.excursionApplication.findUnique({
          where: {
            userId_excursionId: {
              userId: user.id,
              excursionId: excursion.id,
            },
          },
        });

        if (!existingApp) {
          // Créer l'inscription
          await prisma.excursionApplication.create({
            data: {
              userId: user.id,
              excursionId: excursion.id,
              status: "APPROVED",
              inscriptionStatus: "INSCRIT",
            },
          });
          createdCount++;
          console.log(
            `✓ [${i + 1}/60] ${firstName} ${lastName} (${matricule}) - ${email}`
          );
        } else {
          skippedCount++;
          console.log(
            `⊘ [${i + 1}/60] ${email} - Inscription déjà existante`
          );
        }
      } catch (error: any) {
        console.error(
          `✗ Erreur pour ${email}:`,
          error.message
        );
      }
    }

    console.log("\n========== RÉSUMÉ ==========");
    console.log(`✓ Inscriptions créées: ${createdCount}`);
    console.log(`⊘ Inscriptions ignorées: ${skippedCount}`);

    // Afficher le total final
    const finalCount = await prisma.excursionApplication.count({
      where: { excursionId: excursion.id },
    });
    console.log(`\n📊 Total des inscriptions pour Essaouira: ${finalCount}`);

    if (finalCount >= excursion.totalSeats) {
      console.log(`⚠️  Attention: ${finalCount} inscriptions pour ${excursion.totalSeats} places!`);
    }
  } catch (error) {
    console.error("Erreur fatale:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
