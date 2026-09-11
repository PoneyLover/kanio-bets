import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Charge .env.test ICI, dans le processus principal de vitest, AVANT que le
// moindre worker ne demarre. C'est deliberement plus robuste qu'un chargement
// depuis un setupFile : un setupFile s'execute dans le contexte de chaque
// fichier de test, et un module CJS deja compile (comme @kanio/db, importe
// via node_modules) peut y etre resolu/mis en cache par le loader de vitest
// AVANT que le dotenv.config() du setupFile ne s'execute, ce qui a deja
// provoque un bug ou les tests se connectaient a la base de DEV au lieu de
// la base de test. En injectant les variables via `test.env`, vitest les
// place dans process.env de chaque worker des sa creation, sans ambiguite
// d'ordre d'execution des imports.
const testEnvPath = path.resolve(__dirname, ".env.test");
if (!fs.existsSync(testEnvPath)) {
  throw new Error(
    "apps/api/.env.test est introuvable. Copiez .env.test.example vers .env.test et faites-le pointer vers une base Postgres DEDIEE aux tests (ex: schema kanio_test) avant de lancer `npm test`."
  );
}
const testEnv = dotenv.parse(fs.readFileSync(testEnvPath));

if (!testEnv.DATABASE_URL?.includes("test")) {
  throw new Error(
    "DATABASE_URL dans .env.test ne contient pas 'test' - par securite, les tests refusent de s'executer contre une base qui ne ressemble pas a une base de test (les tests suppriment massivement des donnees)."
  );
}

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    setupFiles: ["tests/setup.ts"],
    env: testEnv,
    // Les tests financiers manipulent le meme jeu de donnees Postgres :
    // on les execute sequentiellement pour eviter les interferences.
    fileParallelism: false,
  },
});
