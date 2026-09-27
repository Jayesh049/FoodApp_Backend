const test = require("node:test");
const assert = require("node:assert/strict");
const {
  extractBaseName,
  buildCanonicalImageMap,
  CURATED_BASE_IMAGES,
  normalizeImagePath,
} = require("../utilities/planImageResolver");

test("extractBaseName strips category codes", () => {
  assert.equal(extractBaseName("Biryani NI021"), "Biryani");
  assert.equal(extractBaseName("Paneer Malai Special"), "Paneer Malai Special");
});

test("buildCanonicalImageMap includes curated North Indian dishes", () => {
  const map = buildCanonicalImageMap([], 14);
  assert.equal(map.Biryani, CURATED_BASE_IMAGES.Biryani);
  assert.equal(map["Paneer Tikka"], CURATED_BASE_IMAGES["Paneer Tikka"]);
});

test("normalizeImagePath converts backslashes", () => {
  assert.equal(normalizeImagePath("uploads\\foo.png"), "uploads/foo.png");
});

test("repeated dish prefers dish-folder image for first rotations", () => {
  const map = buildCanonicalImageMap(
    [
      { name: "Custom Dish NI001", image: "uploads/dishes/custom.png" },
      { name: "Custom Dish NI021", image: "uploads/wrong.png" },
    ],
    0
  );
  assert.equal(map["Custom Dish"], "uploads/dishes/custom.png");
  assert.equal(map.Biryani, CURATED_BASE_IMAGES.Biryani);
});
