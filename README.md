# Expense & Sales Manager (Next.js App Router)

Single-tenant expense and sales management system built with **Next.js App Router**, **MongoDB + Mongoose**, **Tailwind CSS**, and **server actions**.

## Core Features

- **System rules**
  - No public registration; single admin user seeded via `npm run seed`
  - Soft deletes via `isActive`/`deletedAt` flags
- **Entities**
  - `Product`, `Staff`, `Route`, `Shop`, `Sale`, `Return`, `CreditPayment`, `User`, `InvoiceCounter`
- **UI**
  - Dashboard with cards for today's sales, monthly sales, outstanding credit, top products
  - Table-first, inline-friendly CRUD pages for products, staff, routes, shops, and sales

## Tech Stack

- Next.js 16 (App Router) under `src/app`
- MongoDB (local) via Mongoose
- Tailwind CSS v4 for styling (`src/app/globals.css`)
- Server actions for most CRUD flows
- API routes for PDF invoices and future Excel exports

## Getting Started

```bash
npm install

# make sure MongoDB is running locally (default URI below)
set MONGODB_URI=mongodb://127.0.0.1:27017/expense_app

npm run seed  # seed demo data
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Folder Structure (High-Level)

- `src/app`
  - `layout.js` / `layout-shell.js` – shared chrome, navigation, and shell
  - `page.js` – dashboard
  - `products/` – product management (inline table + server actions)
  - `staff/` – staff management
  - `shops/` – shop & credit overview
  - `routes/` – route + staff assignment
  - `sales/` – core daily sales entry with inline rows
  - `reports/` – high-level reporting summary and export entry point
  - `api/invoices/[id]/route.js` – PDF invoice generation endpoint
- `src/lib`
  - `db.js` – Mongo connection helper
  - `config.js` – central constants (units, payment types, roles, invoice prefix)
  - `invoice.js` – PDF invoice generator
  - `excel.js` – Excel report helper
- `src/models`
  - Mongoose models for all core entities

## Notes & Next Steps

- Authentication is intentionally minimal: only an `Admin` user is seeded for future integration with your auth solution.
- Returns, credit payments, and detailed Excel exports are scaffolded via models/utilities and can be extended with additional pages and APIs as needed.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
