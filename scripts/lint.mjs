import { accessSync, constants } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const projectRoot = process.cwd();
const requiredFiles = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/db.js",
  "public/stats.js",
  "public/sw.js",
  "public/manifest.webmanifest",
  "public/assets/icon-192.svg",
  "public/assets/icon-512.svg",
];

const jsFiles = [
  "public/app.js",
  "public/db.js",
  "public/stats.js",
  "public/sw.js",
];

function ensureFileExists(relativePath) {
  const absolute = path.join(projectRoot, relativePath);
  accessSync(absolute, constants.F_OK | constants.R_OK);
}

function checkSyntax(relativePath) {
  const absolute = path.join(projectRoot, relativePath);
  execFileSync(process.execPath, ["--check", absolute], { stdio: "inherit" });
}

try {
  for (const file of requiredFiles) {
    ensureFileExists(file);
  }

  for (const file of jsFiles) {
    checkSyntax(file);
  }

  console.log("Lint OK: fichiers requis présents, syntaxe JavaScript valide.");
} catch (error) {
  console.error("Lint échoué.");
  process.exit(1);
}
