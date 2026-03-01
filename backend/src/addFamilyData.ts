import { prisma } from "./db";

// Prénoms marocains pour conjoints
const spouseFirstNames = [
  "Ahmed", "Fatima", "Mohamed", "Leila", "Hassan", "Amina", "Ali", "Zahra",
  "Ibrahim", "Noor", "Karim", "Yasmine", "Samir", "Rania", "Tariq", "Salma",
  "Omar", "Layla", "Youssef", "Hana", "Bilal", "Sara", "Reda", "Nadia",
];

const spouseLastNames = [
  "Alaoui", "Bennani", "Chakri", "Dalal", "Elouafi", "Fakhri", "Gharbi", "Hajji",
  "Jamali", "Kabbaj", "Lakhdar", "Makhlouf", "Nadir", "Ouali", "Patel", "Qadi",
  "Rafi", "Saïdi", "Tahar", "Usman", "Vanini", "Wadi", "Xini", "Yousfi", "Zarkaoui",
];

// Prénoms pour enfants garçons
const boyNames = [
  "Ahmed", "Ali", "Hassan", "Ibrahim", "Mohamed", "Karim", "Samir", "Youssef",
  "Tarik", "Rashid", "Omar", "Bilal", "Reda", "Adil", "Hamza", "Majid",
  "Nabil", "Walid", "Zaki", "Amin",
];

// Prénoms pour enfants filles
const girlNames = [
  "Fatima", "Leila", "Amina", "Zahra", "Noor", "Layla", "Hana", "Sara",
  "Yasmine", "Rania", "Salma", "Nadia", "Dina", "Hiba", "Amira", "Layali",
  "Soraya", "Jalila", "Khadija", "Munira",
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

function generateSpouseName(): string {
  return `${getRandomElement(spouseFirstNames)} ${getRandomElement(spouseLastNames)}`;
}

function generateSpouseEmail(spouseName: string): string {
  const [first, last] = spouseName.split(" ");
  const domains = ["gmail.com", "outlook.com", "yahoo.fr", "hotmail.fr", "ocp.ma"];
  return `${first.toLowerCase()}.${last.toLowerCase()}@${getRandomElement(domains)}`;
}

async function main() {
  try {
    console.log("🚀 Ajout des données familiales et des enfants...\n");

    // 1. Récupérer tous les utilisateurs (sauf admin)
    const users = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      include: { children: true },
    });

    console.log(`📋 Traitement de ${users.length} utilisateurs employés\n`);

    // Distribution réaliste des situations familiales
    // 50% mariés, 30% célibataires, 15% divorcés, 5% veufs
    const maritalStatusDistribution = [
      { status: "MARRIED", weight: 50 },
      { status: "SINGLE", weight: 30 },
      { status: "DIVORCED", weight: 15 },
      { status: "WIDOWED", weight: 5 },
    ];

    let marriedCount = 0;
    let singleCount = 0;
    let divorcedCount = 0;
    let widowedCount = 0;
    let totalChildrenAdded = 0;

    // 2. Remplir les situations familiales
    console.log("📝 Étape 1: Ajout des situations familiales...\n");

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Si l'utilisateur a déjà une situation familiale, la conserver
      if (user.maritalStatus) {
        console.log(`  ⊘ ${user.firstName} ${user.lastName} - Déjà configuré (${user.maritalStatus})`);
        continue;
      }

      // Choisir une situation familiale selon la distribution
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedStatus = "SINGLE";

      for (const item of maritalStatusDistribution) {
        cumulative += item.weight;
        if (random <= cumulative) {
          selectedStatus = item.status;
          break;
        }
      }

      let spouse: string | null = null;
      let spouseEmail: string | null = null;

      if (selectedStatus === "MARRIED") {
        spouse = generateSpouseName();
        spouseEmail = generateSpouseEmail(spouse);
        marriedCount++;
      } else if (selectedStatus === "SINGLE") {
        singleCount++;
      } else if (selectedStatus === "DIVORCED") {
        divorcedCount++;
      } else if (selectedStatus === "WIDOWED") {
        widowedCount++;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          maritalStatus: selectedStatus as any,
          spouse,
          spouseEmail,
        },
      });

      console.log(
        `  ✓ ${user.firstName} ${user.lastName} - ${selectedStatus}${
          spouse ? ` (Conjoint: ${spouse})` : ""
        }`
      );
    }

    console.log(`\n✅ Situations familiales ajoutées:`);
    console.log(`   - Mariés: ${marriedCount}`);
    console.log(`   - Célibataires: ${singleCount}`);
    console.log(`   - Divorcés: ${divorcedCount}`);
    console.log(`   - Veufs: ${widowedCount}\n`);

    // 3. Ajouter des enfants aux utilisateurs mariés
    console.log("👶 Étape 2: Ajout des enfants aux utilisateurs mariés...\n");

    const marriedUsers = await prisma.user.findMany({
      where: {
        maritalStatus: "MARRIED",
        role: "EMPLOYEE",
      },
      include: {
        children: true,
      },
    });

    for (const user of marriedUsers) {
      // Si l'utilisateur a déjà des enfants, ne pas en ajouter
      if (user.children.length > 0) {
        console.log(
          `  ⊘ ${user.firstName} ${user.lastName} - Déjà ${user.children.length} enfant(s)`
        );
        continue;
      }

      // 80% des mariés ont des enfants (1 à 3 enfants)
      if (Math.random() < 0.8) {
        const numberOfChildren = getRandomBetween(1, 3);

        for (let i = 0; i < numberOfChildren; i++) {
          const isGirl = Math.random() < 0.5;
          const firstName = isGirl
            ? getRandomElement(girlNames)
            : getRandomElement(boyNames);
          // Les enfants portent le nom de famille du parent
          const lastName = user.lastName;
          const gender = isGirl ? "FEMALE" : "MALE";
          // Dates de naissance entre 2005 et 2022 (enfants de 2 à 19 ans)
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
          const age = new Date().getFullYear() - dateOfBirth.getFullYear();
          console.log(
            `  ✓ ${user.firstName} ${user.lastName} → ${firstName} ${lastName} (${gender === "MALE" ? "♂" : "♀"}, ${age} ans) - Né(e) le ${dateOfBirth.toLocaleDateString("fr-FR")}`
          );
        }
      } else {
        console.log(`  ⊘ ${user.firstName} ${user.lastName} - Pas d'enfants`);
      }
    }

    console.log(`\n✅ ${totalChildrenAdded} enfant(s) ajouté(s) au total`);

    // 4. Résumé final
    console.log("\n" + "=".repeat(60));
    console.log("📊 RÉSUMÉ FINAL");
    console.log("=".repeat(60));
    console.log(`👥 Utilisateurs traités: ${users.length}`);
    console.log(`💑 Mariés: ${marriedCount}`);
    console.log(`👤 Célibataires: ${singleCount}`);
    console.log(`💔 Divorcés: ${divorcedCount}`);
    console.log(`😢 Veufs: ${widowedCount}`);
    console.log(`👶 Enfants ajoutés: ${totalChildrenAdded}`);
    console.log("=".repeat(60));
    console.log("\n🎉 Toutes les données familiales ont été enregistrées dans PostgreSQL!");

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des données:", error);
    throw error;
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
