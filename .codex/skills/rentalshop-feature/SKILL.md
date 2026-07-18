---
name: rentalshop-feature
description: Implement or modify RentalShop features using the project's Node.js MVC structure. Use when Codex is adding or changing products, accessories, categories, rental orders, payments, finance, users, shifts, payroll, authentication, validation, EJS views, routes, controllers, services, or Mongoose models in the RentalShop project.
---

# RentalShop Feature

Use this skill to implement focused RentalShop application changes.

## Workflow

1. Inspect the related route, controller, service, model, view, validator, and client-side JavaScript.
2. Keep controllers thin: parse requests, validate input, call services, set flash messages, and render or redirect.
3. Put business rules in services.
4. Put schema and database behavior in models.
5. Put shared parsing, constants, validation, and formatting in `utils/`.
6. Keep EJS views focused on rendering and form structure.
7. Use accented Vietnamese for every user-facing string.
8. Preserve existing auth and role middleware patterns.
9. Run available checks before finishing.

## Feature Checklist

- Add or update routes in the matching `routes/*Routes.js` file.
- Add controller actions in the matching `controllers/*Controller.js` file.
- Add business logic in the matching `services/*Service.js` file.
- Add or update Mongoose schema behavior in `models/` only when persistence changes.
- Add or update Joi validation in `utils/validators.js` when request input changes.
- Update EJS views in `views/pages/` or shared partials in `views/partials/`.
- Update client-side behavior in `public/js/app.js` only when necessary.
- Keep search/filter pages showing all records by default.
- Make dropdowns searchable when users need to browse growing option lists.

## Rental Domain Notes

- Product availability, order dates, order statuses, payments, accessories, staff timekeeping, payroll, and finance records can affect each other.
- Before changing those flows, trace the complete path from view to route to controller to service to model.
- Prefer explicit status transitions and validation over implicit assumptions.
- Avoid silently changing historical payment, payroll, or order data.

## Finish Criteria

- The requested behavior is implemented.
- MVC boundaries remain clear.
- UI text is accented Vietnamese.
- Validation and error handling are present.
- Auth protections are unchanged or deliberately strengthened.
- Checks have been run or any inability to run them is reported.
