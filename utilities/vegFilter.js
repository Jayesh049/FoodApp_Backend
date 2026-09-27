/** Dish bases that are typically non-vegetarian in this catalog. */
const NON_VEG_BASES = new Set(
  [
    "Butter Chicken",
    "Seekh Kebab",
    "Biryani",
    "Hyderabadi Biryani",
    "Chettinad Curry",
    "Sesame Chicken",
    "Kung Pao",
    "Sweet Sour",
    "Hot Pot",
    "Wonton Soup",
    "Dumpling",
    "Sushi Roll",
    "Ramen Bowl",
    "Teriyaki Bowl",
    "Dim Sum",
  ].map((s) => s.toLowerCase())
);

const NON_VEG_NAME_RE =
  /\b(chicken|mutton|fish|egg|eggs|prawn|shrimp|lamb|beef|pork|seafood|meat|kebab|non[-\s]?veg|nonveg|bacon|ham|turkey|duck)\b/i;

function baseFromPlanName(name) {
  return String(name || "")
    .replace(/\s+(NI|SI|CH|DS|BV)\d{3}$/i, "")
    .replace(/\s+[A-Z]{2}\d{3}$/i, "")
    .trim()
    .toLowerCase();
}

function isVegetarianPlan(planOrName) {
  const name =
    typeof planOrName === "string" ? planOrName : planOrName?.name || "";
  if (!name) return false;
  if (NON_VEG_NAME_RE.test(name)) return false;
  const base = baseFromPlanName(name);
  if (NON_VEG_BASES.has(base)) return false;
  return true;
}

function filterVegetarianPlans(plans) {
  if (!Array.isArray(plans)) return [];
  return plans.filter(isVegetarianPlan);
}

module.exports = {
  NON_VEG_BASES,
  isVegetarianPlan,
  filterVegetarianPlans,
};
