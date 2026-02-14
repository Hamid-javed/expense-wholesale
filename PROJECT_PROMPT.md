# Project description prompt

Use this when you need to explain what this codebase does (e.g. for AI assistants, onboarding, or documentation).

---

**What this project does**

This is a **single-tenant Expense & Sales Manager** web app. It helps one business track daily sales, products, staff, routes, shops (outlets), and shop credit.

- **Sales & invoicing**  
  Staff record sales per shop/outlet. The app supports PDF invoice generation and combined invoices per staff. Sales are tied to date, route, staff, and shop.

- **Master data**  
  Manage **products** (with units and pricing), **staff**, **routes** (with staff assignment), and **shops** (outlets with optional owner, phone, and **current credit** for credit sales).

- **Credit & payments**  
  Shops can have outstanding credit. The data model supports returns and credit payments; the UI focuses on sales entry and credit overview.

- **Reporting**  
  Dashboard shows today’s sales, monthly sales, total outstanding credit, and top products. There is a reports area and support for Excel export. PDF invoices are generated via API using `pdf-lib`.

- **Tech**  
  Next.js 16 (App Router), MongoDB with Mongoose, Tailwind CSS v4, server actions for CRUD, API routes for PDF invoices and Excel. No public sign-up; a single admin user is seeded with `npm run seed`.

- **Main entities**  
  `Product`, `Staff`, `Route`, `Shop`, `Sale`, `Return`, `CreditPayment`, `User`, `InvoiceCounter`. Soft deletes via `isActive` / `deletedAt`.

In short: **a small business tracks who sold what, to which shop, on which route, with optional credit and PDF invoices.**
