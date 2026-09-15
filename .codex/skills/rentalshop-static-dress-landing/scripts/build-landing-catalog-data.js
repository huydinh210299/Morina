#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const DRESS_CATEGORY_CODES = new Set(["AD", "AL", "CB", "G", "HN", "M", "N", "T", "VD", "VN", "ĐN"]);
const EXCLUDED_CATEGORY_CODES = new Set(["H", "Q"]);
const CATEGORY_NAME_BY_CODE = new Map([
  ["AD", "Áo dài"],
  ["AL", "Áo lụa"],
  ["CB", "Chấm bi"],
  ["G", "Giày"],
  ["HN", "Hoa nhí"],
  ["M", "Mũ"],
  ["N", "Nón"],
  ["T", "Túi"],
  ["VD", "Váy dài"],
  ["VN", "Váy ngắn"],
  ["ĐN", "Váy đen ngắn"]
]);

const readOption = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : "";
};

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"" && insideQuotes && nextCharacter === "\"") {
      current += "\"";
      index += 1;
    } else if (character === "\"") {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current);
  return values;
};

const parseCsv = (content) => {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines.shift() || "").map((header) => header.trim());

  return lines.map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index]?.trim() || "";
      return row;
    }, {});
  });
};

const getImageUrl = (row) => {
  const directLink = row["Direct Image Link"] || "";
  const viewLink = row["View Link"] || "";
  const fileId = directLink.match(/[?&]id=([^&]+)/)?.[1]
    || viewLink.match(/\/d\/([^/]+)/)?.[1]
    || directLink.match(/\/d\/([^/]+)/)?.[1];

  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : directLink;
};

const getGoogleDriveFileId = (url) => {
  return url.match(/[?&]id=([^&]+)/)?.[1] || url.match(/\/d\/([^/]+)/)?.[1] || "";
};

const getAccessoryImageUrl = (row) => {
  const sourceUrl = row["Link công khai"] || "";
  const fileId = row.ID || getGoogleDriveFileId(sourceUrl);
  return fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000` : sourceUrl;
};

const getProductCode = (row) => {
  const categoryCode = (row["Folder Path"] || "").split("/").pop()?.trim().toUpperCase();
  const ordinal = (row["Original Name"] || "").match(/^(\d+)/)?.[1];
  return categoryCode && ordinal ? `${categoryCode}${String(Number(ordinal)).padStart(2, "0")}` : "";
};

const root = process.cwd();
const csvPath = path.join(root, "data", "image_link.csv");
const accessoriesCsvPath = path.join(root, "data", "accessories.csv");
const outputOption = readOption("--output");
const outputPath = path.resolve(root, outputOption || "public/catalog-data.json");
const excludedDressCodes = new Set(
  (readOption("--exclude") || "").split(",").map((code) => code.trim().toUpperCase()).filter(Boolean)
);

if (!fs.existsSync(csvPath)) {
  throw new Error(`Không tìm thấy tệp ảnh: ${csvPath}`);
}

if (!fs.existsSync(accessoriesCsvPath)) {
  throw new Error(`Không tìm thấy tệp phụ kiện: ${accessoriesCsvPath}`);
}

const { DEFAULT_PRODUCTS } = require(path.join(root, "utils", "seedProductData.js"));
const imageByProductCode = new Map();

for (const row of parseCsv(fs.readFileSync(csvPath, "utf8"))) {
  const productCode = getProductCode(row);
  const imageUrl = getImageUrl(row);
  if (productCode && imageUrl) imageByProductCode.set(productCode, imageUrl);
}

const dressProducts = DEFAULT_PRODUCTS
  .filter(({ categoryCode }) => DRESS_CATEGORY_CODES.has(categoryCode) && !EXCLUDED_CATEGORY_CODES.has(categoryCode))
  .map((product) => ({
    code: product.code,
    categoryCode: product.categoryCode,
    categoryName: CATEGORY_NAME_BY_CODE.get(product.categoryCode) || product.categoryCode,
    imageUrl: imageByProductCode.get(product.code) || "",
    sixHPrice: product.sixHPrice,
    fullDayPrice: product.fullDayPrice,
    size: product.size || "",
    isExcluded: excludedDressCodes.has(product.code)
  }));

const accessoryRows = parseCsv(fs.readFileSync(accessoriesCsvPath, "utf8"));
const hasAccessoryStatus = accessoryRows.some((row) => Object.hasOwn(row, "Trạng thái"));
const accessories = accessoryRows
  .filter((row) => !hasAccessoryStatus || row["Trạng thái"] === "Công khai")
  .map((row) => ({
    name: row["Tên ảnh"] || "",
    imageUrl: getAccessoryImageUrl(row),
    sourceUrl: row["Link công khai"] || ""
  }))
  .filter(({ name, imageUrl }) => name && imageUrl);
const unmatchedDressProductCodes = dressProducts.filter(({ imageUrl }) => !imageUrl).map(({ code }) => code);
const productCodeSet = new Set(dressProducts.map(({ code }) => code));
const unknownExcludedDressCodes = [...excludedDressCodes].filter((code) => !productCodeSet.has(code)).sort();
const catalog = {
  generatedAt: new Date().toISOString(),
  excludedDressCodes: [...excludedDressCodes].sort(),
  dressProducts,
  accessories,
  unmatchedDressProductCodes,
  unknownExcludedDressCodes
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Đã tạo ${dressProducts.length} sản phẩm và ${accessories.length} phụ kiện tại ${outputPath}.`);
if (unmatchedDressProductCodes.length) console.warn(`Váy chưa có ảnh: ${unmatchedDressProductCodes.join(", ")}`);
if (unknownExcludedDressCodes.length) console.warn(`Mã váy loại trừ không hợp lệ: ${unknownExcludedDressCodes.join(", ")}`);
