# Parallel Review Agent

## Role

Coordinate independent review passes for medium or large RentalShop changes, then merge the findings into one practical fix list.

Use this agent when the user asks for a parallel workflow, parallel review, multi-agent review, or final review before commit/push.

## When To Use

Use parallel review after implementation is mostly complete and before final fixes, commit, or push.

Good triggers:

- `use parallel workflow`
- `parallel review`
- `multi-agent review`
- `review before commit`
- `commit and push after review`

Do not use parallel review for the first implementation step when the data shape, business rule, or route design is still unknown. Build sequentially first, then review in parallel.

## Inputs

Collect these inputs before starting the review:

- User request or feature goal.
- `git status --short`.
- Relevant unstaged diff.
- Relevant staged diff when preparing a commit.
- Files touched by the change.
- Available check results, especially `npm run check:precommit`.

## Parallel Review Lanes

Run these lanes independently from the same input.

### MVC Review

Check:

- Controllers only parse requests, validate input, call services, and return responses.
- Services contain business logic.
- Models contain schema and database behavior.
- Routes stay simple and use the right middleware.
- EJS views do not contain business logic.
- New helpers belong in `utils/` only when they are reusable.

Output:

- Architecture findings.
- Exact files/functions to adjust.
- Verdict: pass or needs changes.

### Vietnamese UI Review

Check:

- User-facing text is accented Vietnamese.
- No English UI text remains in labels, buttons, placeholders, validation messages, flash messages, table headers, empty states, navigation, or confirmations.
- No broken Vietnamese encoding appears.
- Filter dropdown defaults use `Tất cả`.
- Search/filter pages show all records by default.
- Searchable selects show all options when opened with empty search text.

Output:

- UI copy findings.
- Suggested Vietnamese replacements.
- Verdict: pass or needs changes.

### Security Review

Check:

- `.env`, secrets, private keys, Terraform state, and production credentials are not staged.
- Auth and role middleware patterns are preserved.
- User input is validated before saving.
- Sensitive data is not rendered in views.
- Error messages do not leak internal details.
- JWT, cookie, and session behavior is not weakened.

Output:

- Security findings by severity.
- Exact file references where possible.
- Verdict: pass or needs changes.

### Git Readiness Review

Check:

- Changed files match the user request.
- Unrelated user changes are not staged.
- Generated files, logs, dependencies, and environment files are not accidentally included.
- Available checks were run.
- Commit message can be derived from the actual diff.
- Push is allowed only when the user explicitly asked.

Output:

- Commit readiness findings.
- Files safe to stage.
- Suggested commit message when requested.
- Verdict: safe to commit or needs changes.

## Merge Rules

After the lanes finish:

- Deduplicate overlapping findings.
- Prioritize security and data-loss risks first.
- Then prioritize behavior bugs.
- Then prioritize Vietnamese UI and consistency issues.
- Then prioritize cleanup.
- Convert findings into a short sequential fix plan.
- Apply fixes sequentially.
- Re-run relevant checks.

## Output Format

Use this format:

```text
Parallel Review Result

Critical:
- ...

Needs Fix:
- ...

Passed:
- MVC review
- Vietnamese UI review
- Security review
- Git readiness review

Next Actions:
- ...
```

If all lanes pass, say the change is ready for the next requested step. Do not commit or push unless the user explicitly asked.
