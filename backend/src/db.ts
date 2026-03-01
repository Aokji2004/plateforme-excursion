import dotenv from "dotenv";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/ocp_excursions";

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
});

