const Product = require("../models/Product");

const PRICE_MULTIPLIER = 1000;

const buildProducts = (categoryCode, prefix, fullDayPrices, eightHPrices = fullDayPrices) =>
  fullDayPrices.map((fullDayPrice, index) => ({
    code: `${prefix}${String(index + 1).padStart(2, "0")}`,
    categoryCode,
    fullDayPrice: fullDayPrice * PRICE_MULTIPLIER,
    eightHPrice: eightHPrices[index] * PRICE_MULTIPLIER,
    note: categoryCode === "G" ? "Thuê cùng váy 25k" : ""
  }));

const DEFAULT_PRODUCTS = [
  ...buildProducts("CB", "CB", [85, 85, 110, 89, 85, 90, 90, 90, 85, 90, 90, 95, 90], [70, 70, 85, 70, 70, 70, 80, 70, 70, 75, 70, 70, 70]),
  ...buildProducts("AL", "AL", [120, 100, 90, 99, 110, 89, 110, 99, 95, 95, 95], [89, 80, 70, 80, 89, 69, 89, 80, 79, 79, 79]),
  ...buildProducts("AD", "AD", [100, 110, 90, 110, 120, 100, 110], [80, 70, 79, 90, 100, 80, 80]),
  ...buildProducts("VD", "VD", [110, 130, 100, 95, 85, 120, 100, 120, 95, 120, 110, 120, 110, 95, 95, 110, 110, 120, 115, 115, 115, 90, 120, 130, 120, 120, 95, 95, 110, 120, 110, 120, 100, 120, 150, 90, 100, 95, 100, 100, 95, 95, 100, 120, 120, 90, 120, 95, 99, 120, 110, 115, 110, 120, 110, 95, 95, 100, 95, 110, 105, 100, 110, 140, 120, 120, 110, 110, 120, 110, 120, 110, 110, 120, 115], [80, 100, 79, 70, 70, 100, 80, 100, 80, 100, 90, 100, 90, 80, 80, 90, 90, 100, 95, 95, 90, 70, 100, 100, 100, 100, 80, 80, 95, 100, 95, 100, 80, 100, 120, 70, 80, 75, 70, 70, 70, 70, 80, 100, 100, 70, 100, 75, 75, 100, 90, 95, 95, 110, 95, 70, 70, 80, 70, 95, 90, 85, 90, 120, 100, 100, 90, 90, 100, 95, 100, 95, 95, 100, 95]),
  ...buildProducts("VN", "VN", [80, 95, 99, 80, 99, 95, 95, 90, 95, 90, 85, 90, 95, 99, 95, 90, 80, 85, 85, 100, 90, 90, 95, 90, 100, 95, 95, 95, 95, 90, 95], [59, 70, 75, 69, 80, 70, 70, 70, 79, 65, 65, 75, 80, 80, 75, 75, 65, 70, 80, 85, 75, 70, 75, 70, 80, 79, 70, 80, 80, 75, 80]),
  ...buildProducts("HN", "HN", [85, 90, 90, 90, 85, 90, 90, 85, 85, 85, 85, 90, 90, 85, 85, 85], [70, 70, 70, 70, 70, 70, 70, 69, 70, 70, 70, 75, 75, 70, 70, 70]),
  ...buildProducts("ĐN", "ĐN", [99, 90, 90, 90, 90, 85, 100, 90, 100, 90, 80], [75, 70, 70, 70, 70, 69, 80, 70, 80, 70, 65]),
  ...buildProducts("T", "T", [20, 30, 25, 30, 30, 30, 20, 30, 25, 20, 25]),
  ...buildProducts("G", "G", Array(25).fill(30)),
  ...buildProducts("M", "M", [25, 30, 25, 25, 25, 25]),
  ...buildProducts("H", "H", [35, 35, 40])
];

const seedProductData = async (userId, categories) => {
  const categoriesByCode = new Map(categories.map((category) => [category.code, category._id]));

  for (const product of DEFAULT_PRODUCTS) {
    const category = categoriesByCode.get(product.categoryCode);

    if (!category) {
      throw new Error(`Không tìm thấy danh mục ${product.categoryCode} cho sản phẩm ${product.code}.`);
    }

    const update = {
      $setOnInsert: {
        code: product.code,
        category,
        fullDayPrice: product.fullDayPrice,
        eightHPrice: product.eightHPrice,
        createdBy: userId,
        updatedBy: userId
      }
    };

    if (product.categoryCode === "G") {
      update.$set = {
        note: product.note
      };
    }

    await Product.updateOne({ code: product.code }, update, { upsert: true });
  }
};

module.exports = {
  DEFAULT_PRODUCTS,
  seedProductData
};
