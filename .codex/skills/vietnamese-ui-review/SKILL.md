---
name: vietnamese-ui-review
description: Review RentalShop changes for accented Vietnamese user-facing text, searchable select controls, and correct search/filter defaults. Use when Codex is checking EJS views, controllers, validators, flash messages, client-side JavaScript, forms, tables, filters, or navigation for UI copy quality in the RentalShop project.
---

# Vietnamese UI Review

Use this skill to review RentalShop UI changes before finishing a feature or commit.

## Scope

Review user-facing text in:

- `views/**/*.ejs`
- `controllers/**/*.js`
- `utils/validators.js`
- `utils/validationOptions.js`
- `public/js/**/*.js`
- `services/**/*.js` (if they return user-facing messages)
- route/controller flash messages and validation responses

## Checklist

- Confirm labels, buttons, placeholders, validation messages, flash messages, table headers, menu items, empty states, and confirmation text use accented Vietnamese.
- Flag English UI words such as `Search`, `Submit`, `Cancel`, `Edit`, `Delete`, `Name`, `Status`, `All`, `No data`, `Back`, `Save`, and `Update`.
- Flag mojibake or broken Vietnamese such as `TÃ¬m`, `Tráº¡ng`, `khÃ´ng`, or replacement characters.
- Confirm filter dropdown default labels use `Tất cả`.
- Confirm search/filter pages show all records when no filter is applied.
- Confirm searchable selects show all options when opened with empty search text.
- Confirm empty states are useful Vietnamese phrases such as `Không có dữ liệu` or `Không tìm thấy kết quả phù hợp`.

## Review Output

Lead with findings. For each issue, include:

- file path
- current text or behavior
- suggested Vietnamese replacement or expected behavior

If no issues are found, say the Vietnamese UI review passed and mention any files that were not checked.
