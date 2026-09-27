/**
 * Download one food image per unique dish name → uploads/dishes/
 * Writes uploads/dish-image-map.json for planImageResolver.
 *
 * Usage:
 *   node scripts/download-dish-images.js
 *   node scripts/download-dish-images.js --force   # re-download all
 */
const { downloadAllDishImages } = require("../utilities/dishImageDownloader");

async function main() {
  const force = process.argv.includes("--force");
  console.log("\n=== Download dish images (100 unique dishes) ===\n");

  const result = await downloadAllDishImages({
    skipExisting: !force,
    delayMs: 600,
  });

  console.log("\n=== Summary ===");
  console.log(`Total dishes: ${result.total}`);
  console.log(`Downloaded:   ${result.downloaded}`);
  console.log(`Skipped:      ${result.skipped}`);
  console.log(`Failed:       ${result.failed}`);
  console.log(`Map saved:    uploads/dish-image-map.json`);
  console.log("\nNext: npm run apply-dish-images\n");

  process.exit(result.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Download failed:", err.message);
  process.exit(1);
});
