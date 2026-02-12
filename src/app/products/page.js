import { connectToDatabase } from "../../lib/db";
import { Product } from "../../models/Product";
import { PageHeader } from "../../components/layout/PageHeader";
import { Card, CardBody } from "../../components/ui/Card";
import { ProductsTable } from "./ProductsTable";
import { createProduct, updateProduct, toggleProductActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await connectToDatabase();
  const products = await Product.find({ deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();

  const serialised = products.map((p) => ({
    ...p,
    _id: p._id.toString(),
    quantity: p.quantity ?? 0, // Ensure quantity defaults to 0 if missing
  }));
  console.log(serialised);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Manage products, pricing, and high-level sales aggregates."
      />
      <Card>
        <CardBody>
          <ProductsTable
            products={serialised}
            createProduct={createProduct}
            updateProduct={updateProduct}
            toggleProductActive={toggleProductActive}
          />
        </CardBody>
      </Card>
    </div>
  );
}

