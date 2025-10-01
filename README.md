# Mini Bank API

A simplified banking API built with **NestJS** and **Prisma** that
demonstrates authentication, double-entry ledger transactions, and FX
exchange.

------------------------------------------------------------------------

## 1. Overview

This API simulates a minimal banking system where users can: - Register
and authenticate with JWT + API key. - Maintain accounts in multiple
currencies (USD/EUR). - Perform **double-entry ledger transactions**
(transfer, exchange). - Query balances and transaction history. - Use
idempotency keys to prevent duplicate submissions.

------------------------------------------------------------------------

## 2. Tech Stack

-   **Backend Framework**: [NestJS](https://nestjs.com/)
-   **Database ORM**: [Prisma](https://www.prisma.io/)
-   **Database**: PostgreSQL
-   **Auth**: JWT & API Key middleware
-   **Docs**: Swagger (OpenAPI)
-   **Deployment**: Docker + Docker Compose
-   **Testing**: Jest + Supertest (E2E)

------------------------------------------------------------------------

## 3. Project Setup

### 3.1 Clone the Repository

``` bash
git clone https://github.com/koladee/mini-bank-api.git
cd mini-bank-api
```

### 3.2 Install Dependencies

``` bash
npm install
```

### 3.3 Environment Variables

Create a `.env` file at the project root with the following:

``` env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kolade_bank"
JWT_SECRET="your-very-long-random-secret-string-at-least-32chars"
API_KEY="your-api-key-at-least-16chars"
FX_USD_EUR=0.92
```

-   `DATABASE_URL` → PostgreSQL connection string.\
-   `JWT_SECRET` → Required, must be \>= 32 characters.\
-   `API_KEY` → Required, must be \>= 16 characters.\
-   `FX_USD_EUR` → Exchange rate for USD→EUR.

------------------------------------------------------------------------

## 4. Database & Prisma

### 4.1 Migrate Database

``` bash
npx prisma migrate dev --name init
```

### 4.2 Seed Database

``` bash
npx prisma db seed
```

### 4.3 Generate Prisma Client (if needed)

``` bash
npx prisma generate
```

------------------------------------------------------------------------

## 5. Running the Application

### 5.1 Local Development

``` bash
npm run start:dev
```

Runs on:\
- API → http://localhost:3000\
- Swagger Docs → http://localhost:3000/docs

### 5.2 Docker (Recommended)

``` bash
docker compose up --build
```

This starts both the API and PostgreSQL database.\
You can configure DB port in `.env.docker` if your local machine already
uses 5432.

------------------------------------------------------------------------

## 6. Testing

Run **end-to-end tests** with:

``` bash
npm run test:e2e
```

These tests cover: - Transfer transactions (double-entry check) -
Exchange transactions (balanced ledger check) - Insufficient funds
prevention - Idempotency key enforcement

------------------------------------------------------------------------

## 7. API Documentation

Once running, Swagger is available at:\
👉 <http://localhost:3000/docs>

Endpoints include: - `POST /auth/register` - `POST /auth/login` -
`POST /transactions/transfer` - `POST /transactions/exchange` -
`GET /transactions` - `GET /accounts`

------------------------------------------------------------------------

## 8. Deployment Notes

-   Ensure `.env` is properly configured before deployment.\
-   Prisma requires `binaryTargets` set in `schema.prisma` if deploying
    in Docker/Linux. Example:

``` prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}
```

-   Use `docker compose up --build -d` for background service.\
-   Monitor logs with `docker compose logs -f api`.

------------------------------------------------------------------------

## 9. License

MIT License © 2025
