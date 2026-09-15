---
name: rentalshop-static-dress-landing
description: Create or update a static Vietnamese RentalShop landing page with dress and accessory tabs from local CSV and seed data. Use for customer-facing galleries with rental prices, sizes, categories, and excluded dress codes; do not use for authenticated MVC product management.
---

# RentalShop Static Dress Landing

Build a lightweight, customer-facing static catalog with two tabs: `Váy` and `Phụ kiện`. Keep it independent from the authenticated back-office application unless the user explicitly requests an integration.

## Data source and mapping

- For the `Váy` tab, read images from `data/image_link.csv` and product details from `utils/seedProductData.js`. Import `DEFAULT_PRODUCTS`; do not duplicate its price list or size data manually. Use the category labels already defined in `utils/seedCatalogData.js` when rendering cards.
- Derive the image's product code exactly as the seed does: take the final segment of `Folder Path` as the uppercase category code, take the leading number of `Original Name`, convert it to a number, then zero-pad it to two digits. For example, `dress images/VN` plus `28.jpg` is `VN28`.
- Prefer the Google Drive thumbnail URL shape used by the seed (`https://drive.google.com/thumbnail?id=<id>&sz=w1000`) so images render predictably. Fall back to `Direct Image Link` only when no Drive ID can be extracted.
- Join rows by product code. Do not create a guessed card for a product without an image; report unmatched product codes after generating the page or data.
- Prices in `DEFAULT_PRODUCTS` are Vietnamese đồng. Format them with `Intl.NumberFormat("vi-VN")` and show the rental duration accurately (`sixHPrice` for 6 giờ, `fullDayPrice` for 1 ngày) when both are intended to be shown.
- Use `product.size` as-is. The current seed provides sizes only where present; show `Chưa cập nhật` when it is empty rather than inventing a size.
- For the `Phụ kiện` tab, read `Tên ảnh` and `Link công khai` from `data/accessories.csv`. Include only rows whose `Trạng thái` is `Công khai`, preserve the supplied name and link, and report rows missing either field. Do not invent prices or product codes for accessories.

## Danh sách mã váy loại trừ

This list is the source of truth for individual dress codes excluded from the public `Váy` tab. It is intentionally empty until the owner supplies codes:

```js
const excludedDressCodes = ['VN01', 'VN04'];
```

- When the owner provides codes, update this literal list directly in `SKILL.md` with uppercase codes, for example `const excludedDressCodes = ["VN01", "AD07"];`.
- The generated page and its catalog data must exclude these codes from the public gallery. A management-only review may list them when requested, but it must not appear publicly by default.

## Váy categories

The `Váy` tab must provide a category filter with `Tất cả` plus these exact categories:

- `AD` — Áo dài
- `AL` — Áo lụa
- `CB` — Chấm bi
- `G` — Giày
- `HN` — Hoa nhí
- `M` — Mũ
- `N` — Nón
- `T` — Túi
- `VD` — Váy dài
- `VN` — Váy ngắn
- `ĐN` — Váy đen ngắn

Always exclude the exact category codes `H` (hoa) and `Q` (quần). Do not exclude `HN`: it is a distinct category, `Hoa nhí`.

## Page expectations

- Use two accessible tabs with `aria-selected`, keyboard navigation, and a visible active state: `Váy` and `Phụ kiện`.
- In the `Váy` tab, use an image-first responsive card grid. Each card must show product code, category name, price, and size status. The category filter defaults to `Tất cả`.
- In the `Phụ kiện` tab, use an image-first responsive card grid. Each card must show the accessory name; use its `Link công khai` as the image source and link target when appropriate.
- Paginate both tabs at exactly 20 cards per page. Hide pagination controls only when a tab has 20 or fewer visible cards; preserve the active tab and category-filter state when changing pages, and reset that tab to page 1 when its category filter changes.
- Use fully accented Vietnamese UI text. The public empty state should be `Hiện chưa có mẫu để hiển thị.`
- Use accessible image `alt` text and lazy loading. Provide a useful fallback when an image fails to load.
- Do not add checkout, stock claims, contact details, analytics, publishing, or external embeds unless explicitly requested.
- Keep the output static and runnable without a database. A simple `index.html` with local CSS/JavaScript and generated data is appropriate unless the surrounding project specifies another static-page structure.

## Reusable extractor

Use `scripts/build-landing-catalog-data.js` when a JSON catalog will help the page or needs refreshing. Run it from the RentalShop repository root:

```powershell
node .codex/skills/rentalshop-static-dress-landing/scripts/build-landing-catalog-data.js --output public/catalog-data.json
```

Pass the codes held in `excludedDressCodes` above when regenerating:

```powershell
node .codex/skills/rentalshop-static-dress-landing/scripts/build-landing-catalog-data.js --exclude VN01,AD07 --output public/catalog-data.json
```

The extractor preserves excluded dress records in the JSON with `isExcluded: true`; the page must still filter them from the public gallery.

## Verification

- Confirm the generated dress catalog contains only the listed category codes and no exact `H` or `Q` category records.
- Confirm every public dress card has a valid image URL, prices sourced from the seed, and category-filter behavior.
- Confirm every public accessory card has its name and public link from `accessories.csv`.
- Confirm every code in `excludedDressCodes` has `isExcluded: true` and is absent from the public gallery; correct any code reported as unknown.
- Confirm pages with more than 20 visible cards show exactly 20 cards per page and correct Vietnamese pagination controls.
- Open the page at desktop and mobile widths to check layout, tabs, filters, pagination, image fallbacks, and Vietnamese text.
