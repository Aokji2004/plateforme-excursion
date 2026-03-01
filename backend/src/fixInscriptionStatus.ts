import { prisma } from "./db";

async function main() {
  try {
    console.log("Correction du statut d'inscription original...\n");

    // Récupérer la première excursion
    const excursion = await prisma.excursion.findFirst({
      orderBy: { id: "asc" },
    });

    if (!excursion) {
      console.error("Aucune excursion trouvée!");
      process.exit(1);
    }

    // Mettre à jour tous les statuts originalInscriptionStatus à "INSCRIT"
    const updated = await prisma.excursionApplication.updateMany({
      where: { excursionId: excursion.id },
      data: {
        originalInscriptionStatus: "INSCRIT",
      },
    });

    console.log(`✅ ${updated.count} inscriptions mises à jour!`);
    console.log(`   Tous les statuts d'inscription originale sont maintenant "INSCRIT"`);
  } catch (error) {
    console.error("Erreur:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
