import { prisma } from "./db";

async function main() {
  try {
    // 1. Récupérer la première excursion
    const excursion = await prisma.excursion.findFirst({
      orderBy: { id: "asc" },
    });

    if (!excursion) {
      console.error("Aucune excursion trouvée!");
      process.exit(1);
    }

    console.log(`\nCréation de 70 inscriptions pour: "${excursion.title}" (ID: ${excursion.id})\n`);

    // 2. Créer 70 utilisateurs employés
    const employees = [];
    console.log("Création de 70 employés...");

    for (let i = 1; i <= 70; i++) {
      // Générer des points aléatoires (0 à 500)
      const randomPoints = Math.floor(Math.random() * 501);

      const user = await prisma.user.create({
        data: {
          email: `employee${i}@company.com`,
          passwordHash: `pass${i}`, // Ne pas utiliser en production!
          firstName: `Employé`,
          lastName: `${i}`,
          matricule: `EMP${String(i).padStart(4, "0")}`,
          role: "EMPLOYEE",
          points: randomPoints, // Points aléatoires
        },
      });
      employees.push(user);

      if (i % 10 === 0) {
        console.log(`  ✓ ${i} employés créés...`);
      }
    }

    console.log(`✓ ${employees.length} employés créés\n`);

    // 3. Créer 70 inscriptions
    console.log("Création de 70 inscriptions...");

    const statuses = ["INSCRIT", "SELECTIONNE", "ATTENTE"] as const;
    let inscriptionsCount = 0;

    for (let i = 0; i < employees.length; i++) {
      const status = statuses[i % statuses.length];
      // Générer un score aléatoire (0 à 100)
      const randomScore = Math.floor(Math.random() * 101);

      await prisma.excursionApplication.create({
        data: {
          userId: employees[i].id,
          excursionId: excursion.id,
          status: "PENDING",
          inscriptionStatus: status,
          originalInscriptionStatus: status,
          computedScore: randomScore, // Score aléatoire
        },
      });

      inscriptionsCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ ${i + 1} inscriptions créées...`);
      }
    }

    console.log(`\n✅ ${inscriptionsCount} inscriptions créées avec succès!`);
    console.log(`\nExcursion: ${excursion.title}`);
    console.log(`Nombre total d'inscriptions: ${inscriptionsCount}`);
  } catch (error) {
    console.error("Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
