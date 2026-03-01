// Script pour créer la base ocp_excursions si elle n'existe pas
// Usage: node createDb.js [mot_de_passe]
// Si mot de passe fourni, il remplace celui de DATABASE_URL (utile si .env a un autre mot de passe)
require("dotenv").config();
const { Client } = require("pg");

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL manquant dans .env");
  process.exit(1);
}
// Enlever les guillemets éventuels
connectionString = connectionString.replace(/^["']|["']$/g, "").trim();

// Remplacer le mot de passe par l'argument si fourni (ex: node createDb.js 0000)
const passArg = process.argv[2];
if (passArg) {
  connectionString = connectionString.replace(
    /:\/\/[^:]+:[^@]+@/,
    "://postgres:" + passArg + "@"
  );
}

// Se connecter à la base "postgres" par défaut pour créer notre base
const url = new URL(connectionString);
const dbName = (url.pathname || "/ocp_excursions").slice(1) || "ocp_excursions";
url.pathname = "/postgres";
let adminUrl = url.toString();
// Option pour éviter les erreurs SSL sur connexion locale
if (!adminUrl.includes("?")) adminUrl += "?sslmode=disable";
else if (!adminUrl.includes("sslmode")) adminUrl += "&sslmode=disable";

async function main() {
  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
    const res = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (res.rows.length === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Base "${dbName}" créée.`);
    } else {
      console.log(`Base "${dbName}" existe déjà.`);
    }
  } catch (e) {
    console.error("Erreur:", e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
