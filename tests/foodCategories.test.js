const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FOOD_CATEGORIES,
  buildPlanName,
  generatePlanBatch,
  getCategoryMeta,
} = require("../utilities/foodCategories");

test("defines exactly 5 food categories with unique icons", () => {
  assert.equal(FOOD_CATEGORIES.length, 5);
  const icons = FOOD_CATEGORIES.map((c) => c.icon);
  assert.equal(new Set(icons).size, 5);
  FOOD_CATEGORIES.forEach((c) => {
    assert.ok(c.id);
    assert.ok(c.label);
    assert.ok(c.icon);
    assert.ok(c.bases?.length >= 10);
  });
});

test("buildPlanName stays within 40 characters and is unique per index", () => {
  const a = buildPlanName("north_indian", "Butter Chicken", 1);
  const b = buildPlanName("north_indian", "Butter Chicken", 2);
  assert.ok(a.length <= 40);
  assert.notEqual(a, b);
  assert.match(a, /NI001$/);
});

test("generatePlanBatch creates requested count split across categories", () => {
  const images = ["uploads/test.png"];
  const plans = generatePlanBatch(1000, images);
  assert.equal(plans.length, 1000);

  const names = new Set(plans.map((p) => p.name));
  assert.equal(names.size, 1000);

  FOOD_CATEGORIES.forEach((cat) => {
    const catPlans = plans.filter((p) => p.category === cat.id);
    assert.equal(catPlans.length, 200);
    assert.ok(catPlans.every((p) => p.icon === cat.icon));
    const biryaniLike = catPlans.filter((p) => p.name.startsWith(cat.bases[0]));
    if (biryaniLike.length > 1) {
      assert.equal(biryaniLike[0].image, biryaniLike[1].image);
    }
  });
});

test("getCategoryMeta returns fallback for unknown id", () => {
  const meta = getCategoryMeta("unknown");
  assert.equal(meta.id, FOOD_CATEGORIES[0].id);
});
