# RentalShop

RentalShop is a rental order management system built with Node.js, Express, MongoDB, Mongoose, EJS, and JWT-based authentication. It is designed for small rental teams that need product tracking, order handling, staff operations, and basic finance management in one app.

## Features

- Role-based authentication for admin and staff users
- Product, accessory, and category management
- Rental order creation, status updates, and payment tracking
- Staff timekeeping, shift management, and payroll flows
- Finance page for payment record management
- Dockerized production setup and GitHub Actions deployment to AWS EC2, using MongoDB Atlas

## Tech Stack

- Node.js
- Express
- MongoDB with Mongoose
- EJS templates
- JWT and cookie-based auth
- Docker and Docker Compose
- Terraform for AWS infrastructure

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and update the values for your machine.

### 3. Start the app

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default. On startup (`npm start`, `npm run dev`, or `node server.js`), it connects to MongoDB, applies pending migrations, seeds initial data, and then accepts requests. Completed migrations are skipped using `migration_history`. If a migration fails, startup stops so the app does not serve requests against an incomplete schema.

## Customer data migration

Customer data is migrated automatically on startup. You can also run pending migrations manually:

```bash
npm run migrate:customers
```

This uses `MONGODB_URI` from `.env` and the existing migration runner (including any earlier pending migrations). It creates a unique phone index and groups historical orders by trimmed phone, using the latest order's customer name and the number of orders as `totalOrder`. Orders without a usable string phone are skipped and reported. Back up the database before upgrading. Stop older app instances and start one instance first to finish migrations before starting any others. Migration history prevents subsequent runs from applying it again, and partial failures can be retried without adding counts twice.

The `/customers` page supports name/phone search and pagination. Staff can view it; only admins can edit names/phones or delete customers. Counts increase only when a new order is created; order edits/deletions do not change lifetime counts. Editing a customer's phone does not rewrite historical orders. Deleting a customer keeps their orders; a later order with that phone creates a new customer with count 1. New orders preserve the stored customer name.

## Initial Data

You can seed the app with:

```bash
npm run seed
```

To import accessories from `data/accessories.csv`, run:

```bash
npm run seed:accessories
```

It creates accessories whose code does not exist and updates the name, price, and image of existing accessories without changing their quantity or note.

The initial admin credentials are read from environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Set secure values before seeding in any shared or production environment.

## Environment Variables

Core variables:

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `COOKIE_NAME`
- `NODE_ENV`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

For production deployment, also see `.env.production.example`.

## Deployment

Deployment documentation lives in [DEPLOYMENT.md](./DEPLOYMENT.md). The repository includes:

- A GitHub Actions workflow at `.github/workflows/deploy.yml`
- Docker production files
- Terraform templates under `infra/terraform`

## Health Check

The app exposes a health endpoint at `/health`.

## License

MIT.
