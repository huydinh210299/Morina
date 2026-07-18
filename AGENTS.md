# RentalShop Codex Instructions

## Project Goal

Build and maintain a Node.js MVC rental management application with a clean structure, safe data handling, and a fully accented Vietnamese user interface.

## Architecture Rules

- Use the existing Express, Mongoose, EJS, controller, service, route, middleware, config, and utils structure.
- Keep controllers focused on request parsing, validation, calling services, and returning views or JSON.
- Put business logic in services.
- Keep database access and schema behavior in models.
- Keep reusable parsing, validation, constants, and shared helpers in `utils/`.
- Keep EJS views focused on rendering; avoid business logic in templates.
- Prefer the current project patterns over introducing new frameworks or broad abstractions.

## Vietnamese UI Rules

- All user-facing text must be accented Vietnamese.
- This includes labels, buttons, placeholders, validation messages, flash messages, table headers, menu items, empty states, confirmation text, and static view text.
- Avoid hard-coded English UI text.
- Use consistent vocabulary:
  - Search: `Tìm kiếm`
  - Save: `Lưu`
  - Update: `Cập nhật`
  - Cancel: `Hủy`
  - Edit: `Chỉnh sửa`
  - Delete: `Xóa`
  - Name: `Tên`
  - Status: `Trạng thái`
  - All: `Tất cả`
  - No data: `Không có dữ liệu`
  - Back: `Quay lại`

## Search And Filter Rules

- Empty keyword means no keyword filter.
- A filter dropdown with value `Tất cả` or an empty value means no filter is applied.
- Every select/dropdown that users interact with should be searchable when the option list can grow.
- Searchable selects must show all available options when opened with no search text.
- Clearing search text must show all available options again.
- All list page should have pagination

## Form And Validation Rules

- Validate user input before saving.
- Validation messages must be accented Vietnamese.
- Form labels and placeholders must be accented Vietnamese.
- Errors should be shown on screen and should not break the page.
- Do not leak sensitive details in user-facing error messages.

## Security And Data Safety

- Never commit `.env`, `.env.*` secrets, private keys, Terraform state, or production credentials.
- Keep `.env.example` and `.env.production.example` free of real secrets.
- Do not weaken authentication, cookie, JWT, or role checks.
- Protect private routes with the existing auth middleware patterns.
- Be careful with migration scripts and production deployment files.

## Git Rules

- Do not commit or push unless the user explicitly asks.
- Before committing, inspect `git status` and the relevant diff.
- Stage only files related to the task.
- Run available checks before committing.
- Do not stage unrelated user changes.
- After committing, report the commit hash.
- Push only when the user explicitly asks to push.

### Commit Message Rules

- Use Conventional Commit-style messages: `<prefix>(<optional-scope>): <short imperative summary>`.
- Allowed prefixes:
  - `feat`: add a user-facing feature.
  - `fix`: correct a bug or regression.
  - `refactor`: improve internal code without changing behavior.
  - `docs`: change documentation or project instructions.
  - `test`: add or update automated checks.
  - `chore`: maintenance, tooling, or dependency work.
  - `style`: formatting-only changes with no behavior change.
- Keep the summary lowercase, concise, and without a trailing period.
- Use a scope when it clarifies the affected area, for example `feat(orders): add return-date filter`.
- Do not mix unrelated changes in one commit. Create separate commits when changes have different prefixes or purposes.

## Parallel Review Workflow

Use `.agents/parallel-review-agent.md` when the user asks for a parallel workflow, parallel review, multi-agent review, review before commit, or commit/push after review.

Default pattern:

- Build or fix sequentially.
- Review independent concerns in parallel.
- Merge findings into one fix list.
- Fix sequentially.
- Re-run relevant checks.
- Commit or push only when explicitly requested.

Parallel review lanes:

- MVC review.
- Vietnamese UI review.
- Security review.
- Git readiness review.

## Local Hooks

This repo includes a versioned pre-commit hook at `.githooks/pre-commit`.

Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

The hook runs:

```bash
npm run check:precommit
```

## Final Checklist

- MVC structure is respected.
- User-facing text is accented Vietnamese.
- Dropdown/filter behavior follows the project rules.
- Input is validated before persistence.
- Auth and role protections remain intact.
- No secrets or unsafe environment files are staged.
- Available checks have been run.
