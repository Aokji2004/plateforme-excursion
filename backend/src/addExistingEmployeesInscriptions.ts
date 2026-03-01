import { prisma } from "./db";

async function main() {
  try {
    // 1. Récupérer la première excursion (Marrakech)
    const excursion = await prisma.excursion.findFirst({
      orderBy: { id: "asc" },
    });

    if (!excursion) {
      console.error("Aucune excursion trouvée!");
      process.exit(1);
    }

    console.log(`\nAjout d'employés existants à: "${excursion.title}"\n`);

    // 2. Récupérer les inscriptions existantes
    const existingInscriptions = await prisma.excursionApplication.findMany({
      where: { excursionId: excursion.id },
      select: { userId: true },
    });

    const enrolledUserIds = new Set(existingInscriptions.map(app => app.userId));
    console.log(`✓ ${enrolledUserIds.size} inscriptions existantes`);

    // 3. Récupérer tous les employés
    const allEmployees = await prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      orderBy: { id: "asc" },
    });

    console.log(`✓ ${allEmployees.length} employés trouvés au total`);

    // 4. Récupérer les employés non inscrits
    const unenrolledEmployees = allEmployees.filter(
      emp => !enrolledUserIds.has(emp.id)
    );

    console.log(`✓ ${unenrolledEmployees.length} employés non inscrits\n`);

    // 5. Ajouter des inscriptions pour compléter à 70
    const targetInscriptions = 70;
    const neededInscriptions = Math.max(
      0,
      targetInscriptions - enrolledUserIds.size
    );

    if (neededInscriptions === 0) {
      console.log(`✅ L'excursion a déjà ${enrolledUserIds.size} inscriptions!`);
      return;
    }

    const employeesToAdd = unenrolledEmployees.slice(0, neededInscriptions);

    console.log(`Ajout de ${employeesToAdd.length} inscriptions...\n`);

    const statuses = ["INSCRIT", "SELECTIONNE", "ATTENTE"] as const;
    let addedCount = 0;

    for (let i = 0; i < employeesToAdd.length; i++) {
      const status = statuses[i % statuses.length];

      await prisma.excursionApplication.create({
        data: {
          userId: employeesToAdd[i].id,
          excursionId: excursion.id,
          status: "PENDING",
          inscriptionStatus: status,
          originalInscriptionStatus: status,
        },
      });

      addedCount++;

      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ ${i + 1} inscriptions ajoutées...`);
      }
    }

    console.log(`\n✅ ${addedCount} nouvelles inscriptions créées!`);
    console.log(`\nTotal: ${enrolledUserIds.size + addedCount} inscriptions pour "${excursion.title}"`);
  } catch (error) {
    console.error("Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
