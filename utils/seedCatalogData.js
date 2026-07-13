const Category = require("../models/Category");
const Accessory = require("../models/Accessory");
const Shift = require("../models/Shift");
const { seedProductData } = require("./seedProductData");

const DEFAULT_CATEGORIES = [
  { code: "AD", description: "Áo dài" },
  { code: "AL", description: "Áo lụa" },
  { code: "CB", description: "Chấm bi" },
  { code: "G", description: "Giày" },
  { code: "H", description: "Hoa" },
  { code: "HN", description: "Hoa nhí" },
  { code: "M", description: "Mũ" },
  { code: "T", description: "Túi" },
  { code: "V", description: "Voan" },
  { code: "VD", description: "Váy dài" },
  { code: "VN", description: "Váy ngắn" },
  { code: "ĐN", description: "Váy đen ngắn" }
];

const DEFAULT_ACCESSORIES = [
  { code: "HT", name: "Hoa tai", price: 5000 },
  { code: "KM", name: "Kẹp mắt đeo len", price: 15000 },
  { code: "KT", name: "Kẹp tóc", price: 10000 },
  { code: "LM", name: "Len mắt", price: 69000 },
  { code: "NM", name: "Nhỏ mắt", price: 50000 },
  { code: "NN", name: "Nước ngâm len", price: 50000 },
  { code: "VC", name: "Vòng cổ", price: 10000 }
];

const DEFAULT_SHIFTS = [
  { name: "Sáng", hour: 4, salary: 20000, description: "9h đến 13h" },
  { name: "Chiều", hour: 5, salary: 20000, description: "13h đến 18h" },
  { name: "Tối", hour: 4, salary: 20000, description: "18h đến 22h" }
];

const seedCategoryData = async (userId) => {
  for (const category of DEFAULT_CATEGORIES) {
    await Category.updateOne(
      { code: category.code },
      {
        $setOnInsert: {
          ...category,
          createdBy: userId,
          updatedBy: userId
        }
      },
      { upsert: true }
    );
  }
};

const seedAccessoryData = async (userId) => {
  for (const accessory of DEFAULT_ACCESSORIES) {
    await Accessory.updateOne(
      { code: accessory.code },
      {
        $setOnInsert: {
          ...accessory,
          createdBy: userId,
          updatedBy: userId
        }
      },
      { upsert: true }
    );
  }
};

const seedShiftData = async (userId) => {
  for (const shift of DEFAULT_SHIFTS) {
    const existingShift = await Shift.findOne({ name: shift.name });

    if (existingShift) {
      continue;
    }

    await Shift.create({
      ...shift,
      createdBy: userId,
      updatedBy: userId
    });
  }
};

const seedCatalogData = async (user) => {
  const userId = user?._id?.toString() || "system";

  await seedCategoryData(userId);
  const categories = await Category.find({ code: { $in: DEFAULT_CATEGORIES.map(({ code }) => code) } });
  await seedProductData(userId, categories);
  await seedAccessoryData(userId);
  await seedShiftData(userId);
};

module.exports = seedCatalogData;
