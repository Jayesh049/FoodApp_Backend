const FOOD_CATEGORIES = [
  {
    id: "north_indian",
    label: "North Indian",
    icon: "🍛",
    color: "#E8B86D",
    bases: [
      "Biryani", "Paneer Tikka", "Butter Chicken", "Dal Makhani", "Naan",
      "Rajma", "Chole Bhature", "Paratha", "Kadhi", "Malai Kofta",
      "Tandoori Roti", "Shahi Paneer", "Aloo Gobi", "Pulao", "Korma",
      "Seekh Kebab", "Raita", "Samosa", "Kachori", "Gulab Jamun Cup",
    ],
  },
  {
    id: "south_indian",
    label: "South Indian",
    icon: "🥘",
    color: "#7CB342",
    bases: [
      "Dosa", "Idli", "Vada", "Sambar", "Rasam",
      "Upma", "Pongal", "Appam", "Puttu", "Bisi Bele",
      "Hyderabadi Biryani", "Chettinad Curry", "Avial", "Kootu", "Payasam",
      "Medu Vada", "Uttapam", "Pesarattu", "Curd Rice", "Filter Coffee Set",
    ],
  },
  {
    id: "chinese",
    label: "Chinese",
    icon: "🥡",
    color: "#EF5350",
    bases: [
      "Fried Rice", "Hakka Noodles", "Manchurian", "Spring Roll", "Dim Sum",
      "Kung Pao", "Sweet Sour", "Chow Mein", "Hot Pot", "Wonton Soup",
      "Schezwan Rice", "Garlic Noodles", "Teriyaki Bowl", "Dumpling", "Sushi Roll",
      "Ramen Bowl", "Stir Fry", "Tofu Bowl", "Sesame Chicken", "Chilli Garlic",
    ],
  },
  {
    id: "dessert",
    label: "Desserts",
    icon: "🍰",
    color: "#F48FB1",
    bases: [
      "Chocolate Cake", "Brownie", "Ice Cream", "Pastry", "Cheesecake",
      "Tiramisu", "Muffin", "Donut", "Pudding", "Fruit Tart",
      "Kulfi", "Rasmalai", "Jalebi", "Ladoo", "Barfi",
      "Halwa", "Phirni", "Rabri", "Sandesh", "Modak",
    ],
  },
  {
    id: "beverages",
    label: "Beverages",
    icon: "🥤",
    color: "#4FC3F7",
    bases: [
      "Mango Lassi", "Masala Chai", "Cold Coffee", "Fresh Juice", "Smoothie",
      "Lemonade", "Milkshake", "Iced Tea", "Herbal Tea", "Coconut Water",
      "Buttermilk", "Sharbat", "Hot Chocolate", "Espresso", "Latte",
      "Green Tea", "Protein Shake", "Falooda", "Thandai", "Sugarcane Juice",
    ],
  },
];

const CATEGORY_BY_ID = Object.fromEntries(FOOD_CATEGORIES.map((c) => [c.id, c]));

const {
  buildCanonicalImageMap,
  resolveImageForPlan,
  listUploadImages,
} = require("./planImageResolver");

function getCategoryMeta(categoryId) {
  return CATEGORY_BY_ID[categoryId] || FOOD_CATEGORIES[0];
}

function categoryCode(categoryId) {
  const codes = {
    north_indian: "NI",
    south_indian: "SI",
    chinese: "CH",
    dessert: "DS",
    beverages: "BV",
  };
  return codes[categoryId] || "FD";
}

function buildPlanName(categoryId, baseName, index) {
  const code = categoryCode(categoryId);
  const name = `${baseName} ${code}${String(index).padStart(3, "0")}`;
  return name.slice(0, 40);
}

function generatePlanBatch(totalCount, imagePaths, startIndex = 0) {
  if (!imagePaths.length) {
    throw new Error("At least one image path required in uploads/");
  }

  const imageMap = buildCanonicalImageMap([], 0);
  const poolCache = {};
  const perCategory = Math.floor(totalCount / FOOD_CATEGORIES.length);
  const remainder = totalCount % FOOD_CATEGORIES.length;
  const plans = [];
  let globalIndex = startIndex;

  FOOD_CATEGORIES.forEach((category, catIdx) => {
    const count = perCategory + (catIdx < remainder ? 1 : 0);

    for (let i = 1; i <= count; i += 1) {
      const baseName = category.bases[(i - 1) % category.bases.length];
      const stub = { name: buildPlanName(category.id, baseName, i), category: category.id };
      const image = resolveImageForPlan(stub, imageMap, imagePaths, poolCache);
      const price = 99 + ((globalIndex * 37) % 900);
      const discount = Math.min(price - 10, Math.floor(price * 0.15));
      const duration = 7 + (globalIndex % 28);

      plans.push({
        name: stub.name,
        category: category.id,
        icon: category.icon,
        image,
        images: [image],
        duration,
        price,
        discount: discount > 0 ? discount : undefined,
        averageRating: 3.5 + (globalIndex % 15) / 10,
      });

      globalIndex += 1;
    }
  });

  return plans;
}

module.exports = {
  FOOD_CATEGORIES,
  CATEGORY_BY_ID,
  getCategoryMeta,
  categoryCode,
  buildPlanName,
  generatePlanBatch,
};
