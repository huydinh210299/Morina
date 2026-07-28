const fs = require("fs");
const path = require("path");
const Product = require("../models/Product");

const PRICE_MULTIPLIER = 1000;
const DEFAULT_G_PRICE = 35;
const IMAGE_LINK_CSV_PATH = path.join(__dirname, "..", "data", "image_link.csv");
const DEFAULT_SHOE_SIZES = [
  { code: "G01", size: "38" },
  { code: "G02", size: "37" },
  { code: "G03", size: "38" },
  { code: "G04", size: "37" },
  { code: "G05", size: "07" },
  { code: "G06", size: "37" },
  { code: "G07", size: "38" },
  { code: "G08", size: "37" },
  { code: "G09", size: "38" },
  { code: "G10", size: "37" },
  { code: "G11", size: "37" },
  { code: "G12", size: "37" },
  { code: "G13", size: "38" },
  { code: "G14", size: "37" },
  { code: "G15", size: "37" },
  { code: "G16", size: "38" },
  { code: "G17", size: "36" },
  { code: "G18", size: "37" },
  { code: "G19", size: "38" },
  { code: "G20", size: "37" },
  { code: "G21", size: "37" },
  { code: "G22", size: "38" },
  { code: "G23", size: "38" },
  { code: "G24", size: "38" },
  { code: "G25", size: "38" }
];
const shoeSizeByCode = new Map(DEFAULT_SHOE_SIZES.map(({ code, size }) => [code, size]));

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === "\"" && insideQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (char === "\"") {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
};

const parseCsv = (content) => {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines.shift()).map((header) => header.trim());

  return lines.map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index]?.trim() || "";
      return row;
    }, {});
  });
};

const getDriveFileId = (row) => {
  const directLink = row["Direct Image Link"] || "";
  const viewLink = row["View Link"] || "";
  const idFromQuery = directLink.match(/[?&]id=([^&]+)/)?.[1];
  const idFromPath = viewLink.match(/\/d\/([^/]+)/)?.[1] || directLink.match(/\/d\/([^/]+)/)?.[1];

  return idFromQuery || idFromPath || "";
};

const getDirectImageUrl = (row) => {
  const fileId = getDriveFileId(row);

  if (fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return row["Direct Image Link"] || "";
};

const getProductCodeFromImageRow = (row) => {
  const folderPath = row["Folder Path"] || "";
  const originalName = row["Original Name"] || "";
  const categoryCode = folderPath.split("/").pop()?.trim().toUpperCase();
  const ordinal = originalName.match(/^(\d+)/)?.[1];

  if (!categoryCode || !ordinal) {
    return "";
  }

  return `${categoryCode}${String(Number(ordinal)).padStart(2, "0")}`;
};

const getProductImageUrls = () => {
  if (!fs.existsSync(IMAGE_LINK_CSV_PATH)) {
    return new Map();
  }

  const rows = parseCsv(fs.readFileSync(IMAGE_LINK_CSV_PATH, "utf8"));
  const imageUrlByProductCode = new Map();

  for (const row of rows) {
    const productCode = getProductCodeFromImageRow(row);
    const imageUrl = getDirectImageUrl(row);

    if (productCode && imageUrl) {
      imageUrlByProductCode.set(productCode, imageUrl);
    }
  }

  return imageUrlByProductCode;
};

const buildProducts = (categoryCode, prefix, fullDayPrices, sixHPrices = fullDayPrices) =>
  fullDayPrices.map((fullDayPrice, index) => ({
    code: `${prefix}${String(index + 1).padStart(2, "0")}`,
    categoryCode,
    fullDayPrice: fullDayPrice * PRICE_MULTIPLIER,
    sixHPrice: sixHPrices[index] * PRICE_MULTIPLIER,
    note: categoryCode === "G" ? "Thuê cùng váy 25k" : ""
  }));

const DEFAULT_PRODUCTS = [
  ...buildProducts("CB", "CB", [90, 90, 115, 95, 85, 95, 95, 95, 85, 90, 90, 95, 90], [65, 65, 79, 69, 60, 69, 69, 69, 60, 65, 65, 69, 65]),
  ...buildProducts("AL", "AL", [100, 100, 100, 80, 99, 105, 110, 99, 105, 110, 100], [70, 70, 70, 60, 70, 75, 79, 70, 75, 79, 70]),
  ...buildProducts("AD", "AD", [110, 110, 95, 115, 135, 100, 120, 90, 90, 115, 115, 115, 115, 115, 100, 95, 115, 115, 115, 115, 115, 115, 115, 115, 140, 135, 135, 135, 135, 90, 90, 90, 90, 90], [79, 79, 69, 75, 99, 70, 85, 65, 65, 79, 79, 79, 79, 79, 70, 69, 79, 79, 79, 79, 79, 79, 79, 79, 105, 99, 99, 99, 99, 65, 65, 65, 65, 65]),
  ...buildProducts("VD", "VD", [110, 130, 100, 95, 85, 120, 120, 120, 95, 120, 100, 80, 99, 99, 99, 99, 99, 120, 99, 120, 110, 110, 120, 130, 120, 120, 80, 80, 80, 120, 80, 120, 80, 120, 150, 80, 100, 95, 90, 90, 95, 95, 100, 120, 120, 90, 120, 90, 120, 120, 90, 90, 90, 95, 115, 95, 95, 100, 95, 110, 110, 110, 110, 150, 120, 120, 110, 110, 120, 110, 120, 110, 110, 120, 115, 95, 150, 130, 150, 120, 140, 140, 140], [79, 90, 70, 69, 60, 85, 85, 85, 69, 85, 70, 60, 70, 70, 70, 70, 70, 85, 70, 85, 79, 79, 85, 95, 85, 85, 60, 60, 60, 85, 60, 85, 60, 85, 115, 60, 70, 69, 65, 65, 69, 69, 70, 85, 85, 65, 85, 65, 85, 85, 65, 65, 65, 69, 80, 70, 70, 70, 70, 79, 79, 79, 79, 115, 85, 85, 75, 75, 85, 79, 85, 79, 79, 85, 80, 70, 115, 95, 115, 85, 105, 105, 105]),
  ...buildProducts("VN", "VN", [80, 95, 99, 80, 99, 95, 95, 90, 95, 90, 85, 90, 95, 99, 95, 90, 80, 85, 90, 100, 90, 90, 95, 90, 100, 95, 95, 95, 95, 90, 95, 110, 95, 95, 95, 90], [60, 65, 70, 60, 70, 65, 65, 65, 65, 65, 60, 65, 65, 70, 65, 65, 60, 65, 65, 70, 65, 65, 69, 65, 70, 69, 69, 69, 69, 65, 69, 80, 69, 69, 69, 65]),
  ...buildProducts("HN", "HN", [85, 90, 90, 90, 85, 90, 90, 85, 85, 85, 85, 90, 90, 85, 85, 85, 110, 115, 110, 90], [60, 65, 65, 65, 60, 65, 65, 60, 60, 60, 60, 65, 65, 60, 60, 60, 75, 75, 75, 65]),
  ...buildProducts("ĐN", "ĐN", [99, 90, 90, 90, 90, 85, 100, 90, 100, 90, 80], [70, 65, 65, 65, 65, 60, 70, 65, 70, 65, 60]),
  ...buildProducts("T", "T", [20, 30, 25, 30, 30, 30, 20, 30, 25, 20, 25]),
  ...buildProducts("G", "G", Array(25).fill(DEFAULT_G_PRICE)),
  ...buildProducts("M", "M", [25, 30, 25, 25, 25, 25]),
  ...buildProducts("H", "H", [35, 35, 40]),
  ...buildProducts("N", "N", Array(7).fill(30), Array(7).fill(20)),
  ...buildProducts("Q", "Q", Array(32).fill(0))
];

for (const product of DEFAULT_PRODUCTS) {
  if (product.categoryCode === "G") {
    product.size = shoeSizeByCode.get(product.code) || "";
  }
}

const seedProductData = async (userId, categories) => {
  const categoriesByCode = new Map(categories.map((category) => [category.code, category._id]));
  const imageUrlByProductCode = getProductImageUrls();

  for (const product of DEFAULT_PRODUCTS) {
    const category = categoriesByCode.get(product.categoryCode);

    if (!category) {
      throw new Error(`Không tìm thấy danh mục ${product.categoryCode} cho sản phẩm ${product.code}.`);
    }

    const insertFields = {
      code: product.code,
      category,
      createdBy: userId
    };

    const update = {
      $setOnInsert: insertFields,
      $set: {
        fullDayPrice: product.fullDayPrice,
        sixHPrice: product.sixHPrice,
        updatedBy: userId
      }
    };
    if (product.categoryCode === "G" || product.categoryCode === "N") {
      update.$set = {
        ...update.$set,
        note: product.categoryCode === "N" ? "Thuê lẻ 50k" : product.note
      };
    }

    if (product.categoryCode === "G") {
      update.$set = {
        ...update.$set,
        size: product.size
      };
    }

    update.$unset = { eightHPrice: "", fiveHPrice: "" };
    await Product.updateOne({ code: product.code }, update, { upsert: true });
  }

  const imageUpdateOperations = [...imageUrlByProductCode].map(([productCode, imageUrl]) => ({
    updateOne: {
      filter: { code: productCode },
      update: { $set: { imageUrl } }
    }
  }));

  if (imageUpdateOperations.length) {
    await Product.bulkWrite(imageUpdateOperations, { ordered: false });
  }
};

module.exports = {
  DEFAULT_SHOE_SIZES,
  DEFAULT_PRODUCTS,
  seedProductData
};
