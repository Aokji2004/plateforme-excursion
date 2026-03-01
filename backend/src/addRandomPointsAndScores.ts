import { prisma } from "./db";

async function main() {
  try {
    console.log("\n📊 Ajout de points et scores aléatoires aux employés...\n");

    // Récupérer tous les employés
    const employees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { id: "asc" },
    });

    console.log(`Trouvé: ${employees.length} employés\n`);

    let updatedCount = 0;

    for (const employee of employees) {
      // Générer des points aléatoires (0 à 500)
      const randomPoints = Math.floor(Math.random() * 501);

      // Générer un score aléatoire (0 à 100)
      const randomScore = Math.floor(Math.random() * 101);

      // Mettre à jour l'employé avec les points aléatoires
      await prisma.user.update({
        where: { id: employee.id },
        data: {
          points: randomPoints,
        },
      });

      // Mettre à jour l'application avec le score calculé aléatoire
      const application = await prisma.excursionApplication.findFirst({
        where: { userId: employee.id },
      });

      if (application) {
        await prisma.excursionApplication.update({
          where: { id: application.id },
          data: {
            computedScore: randomScore,
          },
        });
      }

      updatedCount++;

      if (updatedCount % 10 === 0) {
        console.log(`  ✓ ${updatedCount} employés mis à jour...`);
      }
    }

    console.log(`\n✅ ${updatedCount} employés mis à jour avec succès!`);
    console.log(`\nExemples de données générées:`);

    // Afficher quelques exemples
    const samples = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      take: 5,
      orderBy: { id: "asc" },
    });

    for (const sample of samples) {
      const app = await prisma.excursionApplication.findFirst({
        where: { userId: sample.id },
      });
      console.log(`  • ${sample.firstName} ${sample.lastName} - Points: ${sample.points}, Score: ${app?.computedScore}`);
    }
  } catch (error) {
    console.error("Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
