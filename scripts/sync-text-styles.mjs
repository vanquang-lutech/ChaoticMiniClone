import { access, copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceDirectory = process.env.CHAOTIC_CUSTOM_AI_ASSETS_DIR
  ? path.resolve(process.env.CHAOTIC_CUSTOM_AI_ASSETS_DIR, "text-styles")
  : path.resolve(projectRoot, "..", "ChaoticCustomAI", "assets", "text-styles");
const destinationDirectory = path.join(projectRoot, "public", "text-styles");
const expectedImageNames = [
  "collegiate.png",
  "comic-bold.png",
  "gold-foil.png",
  "miami-script.png",
  "pastel-candy.png",
  "pixel-block.png",
  "street-tag.png",
  "y2k-neon.png",
];

await mkdir(destinationDirectory, { recursive: true });

let sourceAvailable = true;
try {
  await access(sourceDirectory);
} catch {
  sourceAvailable = false;
}

if (sourceAvailable) {
  const sourceNames = new Set(await readdir(sourceDirectory));
  const missingNames = expectedImageNames.filter((name) => !sourceNames.has(name));

  if (missingNames.length) {
    throw new Error(`Missing text style assets in ChaoticCustomAI: ${missingNames.join(", ")}`);
  }

  await Promise.all(
    expectedImageNames.map((name) =>
      copyFile(path.join(sourceDirectory, name), path.join(destinationDirectory, name)),
    ),
  );

  console.log(`Synced ${expectedImageNames.length} text style thumbnails from ChaoticCustomAI.`);
} else {
  const committedNames = new Set(await readdir(destinationDirectory));
  const missingNames = expectedImageNames.filter((name) => !committedNames.has(name));

  if (missingNames.length) {
    throw new Error(
      `ChaoticCustomAI assets are unavailable and committed thumbnails are missing: ${missingNames.join(", ")}`,
    );
  }

  console.log(
    `ChaoticCustomAI assets not found at ${sourceDirectory}; using ${expectedImageNames.length} committed thumbnails.`,
  );
}
