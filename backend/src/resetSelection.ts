import { prisma } from "./db";

async function main() {
  try {
    console.log("\n🔄 Réinitialisation des sélections\n");

    // Réinitialiser l'excursion de Marrakech
    const excursion = await prisma.excursion.findFirst({
      where: { city: "Marrakech" }
    });

    if (!excursion) {
      console.log("❌ Aucune excursion trouvée");
      process.exit(1);
    }

    console.log(`Excursion: ${excursion.title} (ID: ${excursion.id})`);

    // Réinitialiser toutes les inscriptions de cette excursion
    const updated = await prisma.excursionApplication.updateMany({
      where: { excursionId: excursion.id },
      data: {
        inscriptionStatus: "INSCRIT",
        originalInscriptionStatus: "INSCRIT",
        selectionOrder: null,
        computedScore: null
      }
    });

    console.log(`✅ ${updated.count} inscriptions réinitialisées à "INSCRIT"`);

    // Réinitialiser l'excursion
    const excursionUpdated = await prisma.excursion.update({
      where: { id: excursion.id },
      data: { selectionStatus: "NOT_STARTED" }
    });

    console.log(`✅ Excursion status: ${excursionUpdated.selectionStatus}`);
    console.log("\n✅ Réinitialisation complète!\n");

  } catch (error: any) {
    console.error("❌ Erreur:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
