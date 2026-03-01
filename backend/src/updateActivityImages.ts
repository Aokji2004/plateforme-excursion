import { prisma } from "./db";

async function main() {
  // Mapping des villes vers les nouvelles URLs d'images Unsplash directes
  const cityImageMap: Record<string, string> = {
    marrakech: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop&q=80",
    essaouira: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&q=80",
    agadir: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop&q=80",
    casablanca: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&h=600&fit=crop&q=80",
  };

  // Récupérer toutes les excursions
  const excursions = await prisma.excursion.findMany({
    select: {
      id: true,
      city: true,
      imageUrl: true,
    },
  });

  console.log(`Trouvé ${excursions.length} activités`);

  // Mettre à jour les images pour chaque excursion
  for (const excursion of excursions) {
    const cityLower = excursion.city.toLowerCase().trim();
    const newImageUrl = cityImageMap[cityLower] || "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop&q=80";

    await prisma.excursion.update({
      where: { id: excursion.id },
      data: { imageUrl: newImageUrl },
    });

    console.log(`✅ Mis à jour: ${excursion.city} (ID: ${excursion.id})`);
  }

  console.log("\n🎉 Toutes les images ont été mises à jour!");
}

main()
  .catch((e) => {
    console.error("Erreur lors de la mise à jour des images:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
