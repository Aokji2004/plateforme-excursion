import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

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
    return;
  }

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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

