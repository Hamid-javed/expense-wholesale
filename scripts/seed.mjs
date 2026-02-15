import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "../src/lib/db.js";
import { Product } from "../src/models/Product.js";
import { Staff } from "../src/models/Staff.js";
import { Shop } from "../src/models/Shop.js";
import { RouteModel } from "../src/models/Route.js";
import { User } from "../src/models/User.js";
import { InvoiceCounter } from "../src/models/InvoiceCounter.js";

const DEFAULT_ADMIN_PASSWORD = "alrazaqtraders";

async function main() {
  await connectToDatabase();

  console.log("Seeding database with demo data...");

  await Promise.all([
    Product.deleteMany({}),
    Staff.deleteMany({}),
    Shop.deleteMany({}),
    RouteModel.deleteMany({}),
    User.deleteMany({}),
    InvoiceCounter.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  const admin = await User.create({
    email: "admin@alrazaqtraders.com",
    name: "Al-Razaq Traders",
    passwordHash,
  });

  const routes = await RouteModel.insertMany([
    { name: "Route A" },
    { name: "Route B" },
  ]);

  const staff = await Staff.insertMany([
    {
      name: "John Doe",
      phone: "111-111-1111",
      routeId: routes[0]._id,
      staffId: "100001",
    },
    {
      name: "Jane Smith",
      phone: "222-222-2222",
      routeId: routes[1]._id,
      staffId: "100002",
    },
  ]);

  const shops = await Shop.insertMany([
    {
      name: "Alpha Store",
      phone: "555-0001",
      currentCredit: 0,
      routeId: routes[0]._id,
    },
    {
      name: "Beta Market",
      phone: "555-0002",
      currentCredit: 0,
      routeId: routes[1]._id,
    },
  ]);

  const products = await Product.insertMany([
    { name: "Product A", sku: "PA-001", unit: "pcs", price: 10 },
    { name: "Product B", sku: "PB-001", unit: "box", price: 25 },
    { name: "Product C", sku: "PC-001", unit: "kg", price: 5 },
  ]);

  await InvoiceCounter.create({ key: "invoice", lastNumber: 0 });

  console.log("Seed complete.");
  console.log({
    admin: { email: admin.email, password: DEFAULT_ADMIN_PASSWORD },
    routes: routes.map((r) => ({ id: r._id.toString(), name: r.name })),
    staff: staff.map((s) => ({ id: s._id.toString(), name: s.name })),
    shops: shops.map((s) => ({ id: s._id.toString(), name: s.name })),
    products: products.map((p) => ({ id: p._id.toString(), name: p.name })),
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

