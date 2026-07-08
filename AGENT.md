# AGENTS.md

## Project Goal

Build a Node.js MVC web application with a clean, maintainable structure and Vietnamese user interface.

## Main Requirements

* Use Node.js with MVC architecture.
* Separate Controllers, Models, Views, Routes, Services, Middleware, Config, and Utils clearly.
* All labels, buttons, placeholders, validation messages, table headers, menu items, and static text must be written in Accented Vietnamese.
* Avoid hard-coded English UI text.
* All select/dropdown controls must be searchable.
* When opening a searchable select without typing anything, display all available options.
* Search/filter pages should display all records by default when no filter is applied.

## Folder Structure

```text
src/
  config/
  controllers/
  middleware/
  models/
  public/
    css/
    js/
  routes/
  services/
  utils/
  views/
```

## MVC Rules

### Controllers

Controllers should:

* Receive requests.
* Validate input.
* Call services.
* Return views or JSON responses.
* Keep business logic out of controllers.

### Services

Services should:

* Contain business logic.
* Process data before returning it to controllers.
* Keep reusable application logic here.

### Models

Models should:

* Represent database entities.
* Handle database queries.
* Avoid UI-related logic.

### Views

Views should:

* Render Accented Vietnamese UI text.
* Use searchable dropdowns.
* Avoid business logic.
* Avoid English static text.

## Vietnamese UI Rules

All user-facing text must be Accented Vietnamese.

Examples:

```text
Search -> Tìm kiếm
Submit -> Lưu
Cancel -> Hủy
Edit -> Chỉnh sửa
Delete -> Xóa
Name -> Tên
Status -> Trạng thái
All -> Tất cả
No data -> Không có dữ liệu
```

## Searchable Select Rules

Every select/dropdown must be searchable.

Required behavior:

* Click the dropdown -> display all available options.
* Do not require the user to type before showing options.
* Type in the search box -> filter matching options in real time.
* Clear the search text -> display all available options again.
* If the select is used as a filter, the first/default option must be `Tất cả`.
* Selecting `Tất cả` means no filter is applied for that field.

Example:

```html
<label for="status">Trạng thái</label>
<select id="status" name="status">
  <option value="">Tất cả</option>
</select>
```

Use a searchable select library when needed, such as:

* Select2
* Tom Select
* Choices.js

## Filter/Search Page Behavior

Search/filter pages must follow these rules:

* On first page load, display all records.
* If the user does not enter any search criteria, display all records.
* Search is only applied when the user enters a keyword or selects a value other than `Tất cả`.
* Empty keyword means no keyword filter.
* `Tất cả` means no dropdown filter.

Example behavior:

```text
Keyword empty + Status = Tất cả
-> Display all records

Keyword = Nguyễn + Status = Tất cả
-> Filter by keyword only

Keyword empty + Status = Hoạt động
-> Filter by status only

Keyword = Nguyễn + Status = Hoạt động
-> Filter by both keyword and status
```

## Form Rules

All forms must:

* Use Accented Vietnamese labels.
* Use Accented Vietnamese placeholders.
* Use Accented Vietnamese validation messages.
* Use searchable selects for dropdown fields.
* Display all select options when no search text is entered.

Example buttons:

```text
Tìm kiếm
Lưu
Cập nhật
Hủy
Xóa
Quay lại
```

## Validation Messages

Validation messages must be Accented Vietnamese.

Examples:

```text
Vui lòng nhập tên.
Email không hợp lệ.
Vui lòng chọn trạng thái.
Dữ liệu đã được lưu thành công.
Đã xảy ra lỗi. Vui lòng thử lại.
```

## Table Rules

Table headers and empty states must be Accented Vietnamese.

Examples:

```text
Không có dữ liệu.
Không tìm thấy kết quả phù hợp.
```

## Coding Guidelines

* Use clean, readable, maintainable code.
* Use meaningful names for files, functions, and variables.
* Keep controllers thin.
* Put business logic in services.
* Put database logic in models or repositories.
* Validate user input before saving.
* Handle errors gracefully.
* Do not duplicate logic.
* Avoid unnecessary comments.
* Do not leave unused code.
* Do not leave console logs in production code.

## Error Rules

* Should show error on screen and do not break the page.

## Final Checklist

Before finishing any feature, verify:

* MVC structure is respected.
* All static text is Accented Vietnamese.
* All labels are Accented Vietnamese.
* All buttons are Accented Vietnamese.
* All validation messages are Accented Vietnamese.
* All dropdown/select controls are searchable.
* Searchable selects display all options when no search text is entered.
* Filter dropdowns have `Tất cả` as the default option.
* Search/filter pages display all records when no filter is applied.
* No unnecessary English UI text remains.
