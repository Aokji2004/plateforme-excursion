import bcrypt from "bcryptjs";
import { prisma } from "./db";

async function main() {
  const email = "mohamed.msaadi@ocp.ma";
  const password = "popap.2004";

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
  console.log("Mot de passe :", password);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

