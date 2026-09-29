/**
 * Canonical FOODAPP veg-only catalog: exactly 200 unique dishes.
 * Plan names must stay ≤40 chars (FoodplanModel maxlength).
 */

const SHOT_TYPES = [
  {
    id: "01",
    key: "hero",
    label: "Hero",
    composition:
      "three-quarter hero shot of a single plated bowl, shallow depth of field, dish fills the frame, dark ceramic bowl",
  },
  {
    id: "02",
    key: "flatlay",
    label: "Flat lay",
    composition:
      "overhead flat-lay top view of one dish centered on dark wood, small vegetarian sides like onion lemon mint chutney nearby, single dish only",
  },
  {
    id: "03",
    key: "macro",
    label: "Macro",
    composition:
      "extreme macro close-up, wooden spoon lifting one bite of the dish, glistening sauce texture, soft bokeh background",
  },
  {
    id: "04",
    key: "serving",
    label: "Serving",
    composition:
      "serving style in traditional brass kadai or plate, steam rising, restaurant plating, dark table setting",
  },
  {
    id: "05",
    key: "editorial",
    label: "Editorial",
    composition:
      "editorial lifestyle wide shot, moody low-key lighting, dish with complimentary flatbread or rice, magazine food photography",
  },
];

const BRAND_POSITIVE =
  "FOODAPP premium food photography, obsidian black backdrop, dark wood surface, " +
  "warm ivory highlights, soft champagne gold rim light, rich saturated colors, " +
  "high detail, appetizing, 100% vegetarian Indian cuisine plating, professional studio light";

const BRAND_NEGATIVE =
  "collage, contact sheet, sprite sheet, grid of photos, multiple dishes montage, " +
  "text, watermark, logo, caption, letters, numbers overlay, " +
  "meat, chicken, mutton, fish, seafood, egg, bacon, non-vegetarian, " +
  "wrong dish color, green spinach gravy when orange butter masala expected, " +
  "plain white rice without cumin seeds, ground cumin powder only, spice dust instead of whole seeds, " +
  "blurry, low quality, cartoon, anime, deformed, duplicate plates, split screen";

/** @type {{ name: string, category: string, cuisineLabel: string }[]} */
const RAW = [
  // —— north_indian (40) ——
  { name: "Paneer Butter Masala", category: "north_indian", cuisineLabel: "North Indian", visualHint: "classic orange-red tomato butter gravy, creamy makhani sauce coating ivory paneer cubes, swirl of cream, coriander garnish, NOT green spinach curry, NOT yellow dal" },
  { name: "Dal Makhani", category: "north_indian", cuisineLabel: "North Indian", visualHint: "authentic Punjabi dal makhani like restaurant photos: thick dark brown-black creamy whole urad lentils and rajma visible in gravy, generous white cream swirl on top, melting butter dollop, glossy sheen, stainless steel or dark bowl, cilantro optional, NOT yellow dal, NOT tadka with fried garlic chili pile" },
  { name: "Aloo Gobi", category: "north_indian", cuisineLabel: "North Indian", visualHint: "dry turmeric-yellow cauliflower and potato stir fry" },
  { name: "Chole Bhature", category: "north_indian", cuisineLabel: "North Indian", visualHint: "puffed golden bhature with spicy chickpea curry" },
  { name: "Paneer Tikka", category: "north_indian", cuisineLabel: "North Indian", visualHint: "charred tandoori paneer cubes with peppers and onion" },
  { name: "Palak Paneer", category: "north_indian", cuisineLabel: "North Indian", visualHint: "bright green spinach gravy with paneer cubes" },
  { name: "Dal Tadka", category: "north_indian", cuisineLabel: "North Indian", visualHint: "yellow tempered lentils with ghee tadka" },
  { name: "Rajma Masala", category: "north_indian", cuisineLabel: "North Indian", visualHint: "red kidney bean curry in thick tomato gravy" },
  { name: "Mixed Veg Curry", category: "north_indian", cuisineLabel: "North Indian", visualHint: "colorful mixed vegetable curry" },
  { name: "Veg Biryani", category: "north_indian", cuisineLabel: "North Indian", visualHint: "layered saffron basmati with vegetables and fried onions" },
  { name: "Butter Naan", category: "north_indian", cuisineLabel: "North Indian", visualHint: "soft blistered naan brushed with melted butter" },
  { name: "Laccha Paratha", category: "north_indian", cuisineLabel: "North Indian", visualHint: "flaky layered whole-wheat paratha" },
  { name: "Dal Fry", category: "north_indian", cuisineLabel: "North Indian", visualHint: "thick yellow fried dal with tadka" },
  { name: "Kadai Paneer", category: "north_indian", cuisineLabel: "North Indian", visualHint: "paneer and capsicum in spicy tomato kadai gravy" },
  { name: "Shahi Paneer", category: "north_indian", cuisineLabel: "North Indian", visualHint: "rich creamy white-orange shahi gravy with paneer" },
  { name: "Malai Kofta", category: "north_indian", cuisineLabel: "North Indian", visualHint: "fried kofta balls in creamy orange gravy" },
  { name: "Malai Paneer", category: "north_indian", cuisineLabel: "North Indian", visualHint: "soft paneer in silky pale malai gravy" },
  { name: "Aloo Matar", category: "north_indian", cuisineLabel: "North Indian", visualHint: "potato and green pea curry" },
  { name: "Bhindi Masala", category: "north_indian", cuisineLabel: "North Indian", visualHint: "spiced okra stir fry" },
  { name: "Baingan Bharta", category: "north_indian", cuisineLabel: "North Indian", visualHint: "smoky mashed eggplant curry" },
  { name: "Chana Masala", category: "north_indian", cuisineLabel: "North Indian", visualHint: "chickpea curry in reddish tomato masala" },
  { name: "Paneer Bhurji", category: "north_indian", cuisineLabel: "North Indian", visualHint: "scrambled spiced paneer" },
  { name: "Mattar Paneer", category: "north_indian", cuisineLabel: "North Indian", visualHint: "peas and paneer in light tomato gravy" },
  { name: "Navratan Korma", category: "north_indian", cuisineLabel: "North Indian", visualHint: "mild creamy white korma with mixed vegetables" },
  { name: "Veg Pulao", category: "north_indian", cuisineLabel: "North Indian", visualHint: "fragrant vegetable rice pulao" },
  { name: "Kashmiri Dum Aloo", category: "north_indian", cuisineLabel: "North Indian", visualHint: "baby potatoes in red Kashmiri gravy" },
  { name: "Stuffed Paratha", category: "north_indian", cuisineLabel: "North Indian", visualHint: "stuffed flatbread with butter" },
  { name: "Tandoori Roti", category: "north_indian", cuisineLabel: "North Indian", visualHint: "whole wheat tandoor roti" },
  { name: "Phulka Roti", category: "north_indian", cuisineLabel: "North Indian", visualHint: "puffed soft phulka" },
  { name: "Amritsari Kulcha", category: "north_indian", cuisineLabel: "North Indian", visualHint: "stuffed Amritsari kulcha" },
  { name: "Paneer Tikka Masala", category: "north_indian", cuisineLabel: "North Indian", visualHint: "tandoori paneer in orange tikka masala gravy" },
  { name: "Methi Malai Matar", category: "north_indian", cuisineLabel: "North Indian", visualHint: "fenugreek cream peas curry pale green-white" },
  { name: "Aloo Jeera", category: "north_indian", cuisineLabel: "North Indian", visualHint: "cumin potato dry fry" },
  { name: "Kadhi Pakora", category: "north_indian", cuisineLabel: "North Indian", visualHint: "yogurt kadhi with pakora" },
  { name: "Samosa Plate", category: "north_indian", cuisineLabel: "North Indian", visualHint: "crispy triangular vegetable samosas" },
  { name: "Pav Bhaji", category: "north_indian", cuisineLabel: "North Indian", visualHint: "mashed vegetable bhaji with buttered pav" },
  { name: "Veg Kofta Curry", category: "north_indian", cuisineLabel: "North Indian", visualHint: "vegetable kofta in orange gravy" },
  { name: "Corn Palak", category: "north_indian", cuisineLabel: "North Indian", visualHint: "spinach corn curry green gravy" },
  { name: "Boondi Raita", category: "north_indian", cuisineLabel: "North Indian", visualHint: "yogurt raita with boondi" },

  // —— south_indian (40) ——
  { name: "Masala Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Idli Sambar", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Medu Vada", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Ven Pongal", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Coconut Chutney", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Plain Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Rava Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Onion Uttapam", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Pesarattu", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Appam Stew", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Bisi Bele Bath", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Sambar Bowl", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Rasam Bowl", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Avial", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Vegetable Kootu", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Curd Rice", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Lemon Rice", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Tamarind Rice", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Tomato Rice", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Upma Bowl", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Ragi Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Set Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Ghee Roast Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Mysore Masala Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Podi Idli", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Thatte Idli", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Mini Idli Sambar", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Filter Coffee", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Banana Leaf Thali", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Coconut Rice", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Vegetable Stew", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Adai Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Puttu Kadala", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Kerala Parotta", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Tomato Chutney", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Gunpowder Podi", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Molaga Podi Idli", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Sambar Vada", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Neer Dosa", category: "south_indian", cuisineLabel: "South Indian" },
  { name: "Akki Roti", category: "south_indian", cuisineLabel: "South Indian" },

  // —— chinese / Indo-Chinese veg (40) ——
  { name: "Veg Fried Rice", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Chilli Paneer", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Hakka Noodles", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Manchurian", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Spring Rolls", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Schezwan Fried Rice", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Garlic Noodles", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Paneer Manchurian", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Chow Mein", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Sweet Corn Soup", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Hot Sour Soup", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Dumplings", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Crispy Chilli Potato", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Gobi Manchurian", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Paneer Chilli Dry", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Schezwan Noodles", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Tofu Stir Fry", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Mushroom Manchurian", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Momos Steamed", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Momos Fried", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Honey Chilli Potato", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "American Chop Suey", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Burnt Garlic Rice", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Paneer in Hot Garlic", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Cantonese Rice", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Chilli Garlic Noodles", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Singapore Noodles", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Crispy Corn Salt", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Schezwan Paneer", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Triple Schezwan", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Baby Corn Manchurian", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Hot Pot Bowl", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Sesame Tofu Bowl", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Wonton Soup", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Kung Pao Paneer", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Sweet Sour", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Teriyaki Veg Bowl", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Dim Sum Platter", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Chilli Mushroom", category: "chinese", cuisineLabel: "Indo-Chinese" },
  { name: "Veg Drums of Heaven", category: "chinese", cuisineLabel: "Indo-Chinese" },

  // —— dessert (40) ——
  { name: "Gulab Jamun", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Rasmalai", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Kulfi Slice", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Gajar Halwa", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Moong Dal Halwa", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Phirni Bowl", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Rabri Bowl", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Jalebi Stack", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Besan Ladoo", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Kaju Barfi", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Sandesh Plate", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Modak Plate", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Payasam Bowl", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Shahi Tukda", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Malpua Rabri", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Fruit Custard", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Fruit Chaat", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Chocolate Brownie", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Chocolate Cake Slice", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Cheesecake Slice", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Tiramisu Cup", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Fruit Tart", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Vanilla Ice Cream", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Mango Ice Cream", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Falooda Glass", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Kheer Bowl", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Coconut Barfi", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Pista Kulfi", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Rasgulla Bowl", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Imarti Plate", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Caramel Pudding", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Mango Mousse", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Chocolate Mousse", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Apple Pie Slice", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Blueberry Muffin", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Donut Glazed", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Pastry Cream Roll", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Basundi Bowl", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Mysore Pak", category: "dessert", cuisineLabel: "Dessert" },
  { name: "Coconut Ladoo", category: "dessert", cuisineLabel: "Dessert" },

  // —— beverages + light / breakfast-leaning mapped to beverages (40) ——
  { name: "Mango Lassi", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Masala Chai", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Cold Coffee", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Fresh Orange Juice", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Berry Smoothie", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Lemonade Glass", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Chocolate Milkshake", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Iced Tea", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Herbal Tea", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Coconut Water", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Chaas Buttermilk", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Rose Sharbat", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Hot Chocolate", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Espresso Shot", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Cafe Latte", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Green Tea Cup", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Protein Smoothie", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Thandai Glass", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Sugarcane Juice", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Watermelon Juice", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Pomegranate Juice", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Sweet Lassi", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Salted Lassi", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Badam Milk", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Turmeric Latte", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Matcha Latte", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Virgin Mojito", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Nimbu Pani", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Jaljeera Glass", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Aam Panna", category: "beverages", cuisineLabel: "Beverages" },
  { name: "Quinoa Salad Bowl", category: "beverages", cuisineLabel: "Light Bowl" },
  { name: "Sprouts Chaat", category: "beverages", cuisineLabel: "Light Bowl" },
  { name: "Grilled Paneer Salad", category: "beverages", cuisineLabel: "Light Bowl" },
  { name: "Vegetable Soup", category: "beverages", cuisineLabel: "Light Bowl" },
  { name: "Millet Khichdi", category: "beverages", cuisineLabel: "Light Bowl" },
  { name: "Veg Oats Upma", category: "beverages", cuisineLabel: "Breakfast" },
  { name: "Poha Bowl", category: "beverages", cuisineLabel: "Breakfast" },
  { name: "Dahi Fruits Bowl", category: "beverages", cuisineLabel: "Breakfast" },
  { name: "Cucumber Salad", category: "beverages", cuisineLabel: "Light Bowl" },
  { name: "Steamed Veggies", category: "beverages", cuisineLabel: "Light Bowl" },
];

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

const CATEGORY_ICONS = {
  north_indian: "🌿",
  south_indian: "🌿",
  chinese: "🌿",
  dessert: "🌿",
  beverages: "🌿",
};

function buildDishCatalog() {
  if (RAW.length !== 199) {
    throw new Error(`Expected 199 dishes, got ${RAW.length}`);
  }
  const seen = new Set();
  return RAW.map((row, index) => {
    const name = row.name.slice(0, 40);
    if (seen.has(name)) {
      throw new Error(`Duplicate dish name: ${name}`);
    }
    seen.add(name);
    const slug = slugify(name);
    const id = String(index + 1).padStart(3, "0");
    const price = 129 + ((index * 17) % 320);
    const discount = Math.min(price - 20, 8 + (index % 12));
    const duration = 15 + (index % 25);
    const averageRating = Number((4.2 + (index % 8) * 0.1).toFixed(1));
    return {
      id,
      name,
      slug,
      category: row.category,
      cuisineLabel: row.cuisineLabel,
      icon: CATEGORY_ICONS[row.category] || "🌿",
      price,
      discount,
      duration,
      averageRating,
      description: `Premium vegetarian ${name} — plated for FOODAPP with dark-luxury studio craft.`,
      visualHint: row.visualHint || "",
    };
  });
}

const DISH_CATALOG_200 = buildDishCatalog();

function imagePathsForDish(dish) {
  return SHOT_TYPES.map(
    (shot) => `uploads/dishes/${dish.slug}/${dish.slug}-${shot.id}.png`
  );
}

function absoluteDishDir(uploadsRoot, dish) {
  const path = require("path");
  return path.join(uploadsRoot, "dishes", dish.slug);
}

module.exports = {
  SHOT_TYPES,
  BRAND_POSITIVE,
  BRAND_NEGATIVE,
  DISH_CATALOG_200,
  slugify,
  imagePathsForDish,
  absoluteDishDir,
  buildDishCatalog,
};
