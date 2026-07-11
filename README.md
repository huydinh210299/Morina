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

The app runs on `http://localhost:3000` by default.

## Initial Data

You can seed the app with:

```bash
npm run seed
```

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

MIT
