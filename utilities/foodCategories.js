const FOOD_CATEGORIES = [
  {
    id: "north_indian",
    label: "North Indian",
    icon: "🌿",
    color: "#E8B86D",
    bases: [
      "Paneer Butter Masala", "Dal Makhani", "Aloo Gobi", "Chole Bhature",
      "Paneer Tikka", "Palak Paneer", "Dal Tadka", "Rajma Masala", "Mixed Veg Curry",
      "Veg Biryani", "Butter Naan", "Laccha Paratha", "Dal Fry", "Kadai Paneer",
      "Shahi Paneer", "Malai Kofta", "Malai Paneer", "Aloo Matar", "Bhindi Masala",
    ],
  },
  {
    id: "south_indian",
    label: "South Indian",
    icon: "🌿",
    color: "#7CB342",
    bases: [
      "Masala Dosa", "Idli Sambar", "Medu Vada", "Ven Pongal", "Coconut Chutney",
      "Plain Dosa", "Rava Dosa", "Onion Uttapam", "Pesarattu", "Appam Stew",
      "Bisi Bele Bath", "Sambar Bowl", "Rasam Bowl", "Avial", "Vegetable Kootu",
      "Curd Rice", "Lemon Rice", "Tamarind Rice", "Tomato Rice", "Upma Bowl",
    ],
  },
  {
    id: "chinese",
    label: "Indo-Chinese",
    icon: "🌿",
    color: "#EF5350",
    bases: [
      "Veg Fried Rice", "Chilli Paneer", "Hakka Noodles", "Veg Manchurian", "Veg Spring Rolls",
      "Schezwan Fried Rice", "Garlic Noodles", "Paneer Manchurian", "Veg Chow Mein", "Sweet Corn Soup",
      "Hot Sour Soup", "Veg Dumplings", "Crispy Chilli Potato", "Gobi Manchurian", "Paneer Chilli Dry",
      "Veg Schezwan Noodles", "Tofu Stir Fry", "Mushroom Manchurian", "Veg Momos Steamed", "Honey Chilli Potato",
    ],
  },
  {
    id: "dessert",
    label: "Desserts",
    icon: "🌿",
    color: "#F48FB1",
    bases: [
      "Gulab Jamun", "Rasmalai", "Kulfi Slice", "Gajar Halwa", "Moong Dal Halwa",
      "Phirni Bowl", "Rabri Bowl", "Jalebi Stack", "Besan Ladoo", "Kaju Barfi",
      "Sandesh Plate", "Modak Plate", "Payasam Bowl", "Shahi Tukda", "Malpua Rabri",
      "Fruit Custard", "Fruit Chaat", "Chocolate Brownie", "Kheer Bowl", "Rasgulla Bowl",
    ],
  },
  {
    id: "beverages",
    label: "Beverages",
    icon: "🌿",
    color: "#4FC3F7",
    bases: [
      "Mango Lassi", "Masala Chai", "Cold Coffee", "Fresh Orange Juice", "Berry Smoothie",
      "Lemonade Glass", "Chocolate Milkshake", "Iced Tea", "Herbal Tea", "Coconut Water",
      "Chaas Buttermilk", "Rose Sharbat", "Hot Chocolate", "Cafe Latte", "Green Tea Cup",
      "Thandai Glass", "Sugarcane Juice", "Quinoa Salad Bowl", "Poha Bowl", "Millet Khichdi",
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
