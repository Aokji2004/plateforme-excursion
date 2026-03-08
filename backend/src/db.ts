import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

if (process.env.NODE_ENV === "production") {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("[Config] DATABASE_URL est obligatoire en production.");
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error("[Config] DATABASE_URL doit être une URL PostgreSQL (postgresql://...).");
  }
}

const connectionString =
  process.env.DATABASE_URL?.trim() ||
  "postgresql://postgres:postgres@localhost:5432/ocp_excursions";

// Render PostgreSQL (external) exige SSL ; on l'impose en prod si l'URL pointe vers render.com
const isRenderExternal =
  process.env.NODE_ENV === "production" &&
  /\.(oregon|frankfurt|ohio)-postgres\.render\.com/i.test(connectionString);

const pool = new Pool({
  connectionString,
  ...(isRenderExternal && {
    ssl: { rejectUnauthorized: true },
  }),
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});

