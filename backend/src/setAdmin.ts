import bcrypt from "bcryptjs";
import { prisma } from "./db";

const NEW_EMAIL = "mohamed.msaadi@ocp.ma";
const NEW_PASSWORD = "popap.2004";

async function main() {
  // Trouver l'admin existant (admin@ocp.ma ou premier ADMIN)
  let admin = await prisma.user.findUnique({
    where: { email: "admin@ocp.ma" },
  });
  if (!admin) {
    admin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
  }

  if (!admin) {
    console.log("Aucun admin trouvé. Création du compte admin...");
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
    const user = await prisma.user.create({
      data: {
        email: NEW_EMAIL,
        passwordHash,
        firstName: "Mohamed",
        lastName: "Msaadi",
        role: "ADMIN",
        points: 0,
      },
    });
    console.log("✅ Admin créé :", user.email);
    return;
  }

  const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      email: NEW_EMAIL,
      passwordHash,
      firstName: "Mohamed",
      lastName: "Msaadi",
    },
  });

  console.log("✅ Admin mis à jour.");
  console.log("   Email    :", NEW_EMAIL);
  console.log("   Mot de passe :", NEW_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
