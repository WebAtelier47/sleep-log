import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const publicDir = path.join(root, "public");
const distDir = path.join(root, "dist");

if (!existsSync(publicDir)) {
  console.error("Build échoué: dossier public/ introuvable.");
  process.exit(1);
}

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
}

mkdirSync(distDir, { recursive: true });
cpSync(publicDir, distDir, { recursive: true });

console.log("Build OK: contenu de public/ copié vers dist/.");
