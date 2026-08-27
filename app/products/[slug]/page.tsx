import { notFound } from "next/navigation";
import ProductCustomizer from "@/components/product-customizer";
import { getProduct } from "@/lib/products";

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductCustomizer product={product} />;
}
