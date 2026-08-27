import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const source = process.env.CHAOTIC_PRODUCTS_SOURCE ?? "C:\\Users\\VAN QUANG\\Downloads\\back-to-school-product.json";
const destination = resolve("data", "back-to-school-products.json");

try {
  await mkdir(resolve("data"), { recursive: true });
  const { products = [] } = JSON.parse(await readFile(source, "utf8"));
  const compactCatalogue = {
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      body_html: product.body_html,
      tags: product.tags,
      images: product.images,
      options: product.options,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        available: variant.available,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
      })),
    })),
  };
  await writeFile(destination, JSON.stringify(compactCatalogue));
  console.log(`Imported ${products.length} products from ${basename(source)}.`);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log("Product data source is not available; using the checked-in catalogue.");
  } else {
    throw error;
  }
}
