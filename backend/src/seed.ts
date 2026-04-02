import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ensureDemoExcursions } from "./seedDemoExcursions";

dotenv.config();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "mohamed.msaadi@ocp.ma";
  const password = process.env.SEED_ADMIN_PASSWORD || "popap.2004";

  if (process.env.NODE_ENV === "production" && password === "popap.2004") {
    console.error("En production, définissez SEED_ADMIN_PASSWORD (et éventuellement SEED_ADMIN_EMAIL) dans .env. Ne pas utiliser le mot de passe par défaut.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Utilisateur admin déjà existant :", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: "Mohamed",
        lastName: "Msaadi",
        role: "ADMIN",
        points: 0,
      },
    });

    console.log("Utilisateur admin créé :");
    console.log("Email :", user.email);
    if (process.env.NODE_ENV !== "production") {
      console.log("Mot de passe :", password);
    }
  }

  const typeCount = await prisma.activityType.count();
  if (typeCount === 0) {
    await prisma.activityType.createMany({
      data: [
        {
          title: "Excursion famille (long séjour)",
          beneficiary: "FAMILY",
          points: 6,
          pointsPerChild: 2,
          pointsConjoint: 3,
        },
        {
          title: "Escapade couple (week-end)",
          beneficiary: "COUPLE",
          points: 4,
          pointsPerChild: 0,
          pointsConjoint: 2,
        },
        {
          title: "Sortie / journée célibataire",
          beneficiary: "SINGLE",
          points: 2,
          pointsPerChild: 0,
          pointsConjoint: 0,
        },
        {
          title: "Dîner / événement couple",
          beneficiary: "COUPLE",
          points: 2,
          pointsPerChild: 0,
          pointsConjoint: 1,
        },
      ],
    });
    console.log("Types d’activité par défaut créés : 4 entrées (base vide).");
  } else {
    console.log("Types d’activité déjà présents :", typeCount, "(inchangé).");
  }

  await ensureDemoExcursions();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

