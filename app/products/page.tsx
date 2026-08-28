import type { Metadata } from "next";
import AllProducts from "@/components/all-products";
import { products } from "@/lib/products";

export const metadata: Metadata = {
  title: "All Products — Chaotic Club",
  description: "Browse every Chaotic Club product from the complete catalogue.",
};

export default function ProductsPage() {
  return <AllProducts products={products} />;
}
