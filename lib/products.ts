import catalogue from "@/data/back-to-school-products.json";

type RawImage = { src: string; alt?: string };
type RawVariant = { id: number; title: string; option1: string | null; option2: string | null; option3: string | null; available: boolean; price: string; compare_at_price: string | null; featured_image?: RawImage | null };
type RawOption = { name: string; position: number; values: string[] };
type RawProduct = { id: number; title: string; handle: string; body_html: string; tags: string[]; images: RawImage[]; options: RawOption[]; variants: RawVariant[] };
type RawCatalogue = { products: RawProduct[] };

export type StoreVariant = { id: number; title: string; options: string[]; available: boolean; price: number; compareAtPrice: number | null; image: string | null };
export type StoreOption = { name: string; values: string[] };
export type StoreProduct = { id: number; slug: string; name: string; shortName: string; price: number; originalPrice: number; image: string; images: Array<{ src: string; alt: string }>; description: string; tags: string[]; options: StoreOption[]; variants: StoreVariant[] };

const rawProducts = (catalogue as RawCatalogue).products;
const toNumber = (value: string | null | undefined) => { const parsed = Number.parseFloat(value ?? ""); return Number.isFinite(parsed) ? parsed : 0; };
const plainText = (html: string) => html.replace(/<li[^>]*>/gi, "").replace(/<\/li>/gi, ". ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().replace(/\.$/, "");
const shortName = (title: string) => title.replace(/^Chaotic Club\s+/i, "").replace(/\s+Mesh Jersey$/i, "");

function normaliseProduct(product: RawProduct): StoreProduct {
  const variants = product.variants.map((variant) => ({ id: variant.id, title: variant.title, options: [variant.option1, variant.option2, variant.option3].filter((value): value is string => Boolean(value)), available: variant.available, price: toNumber(variant.price), compareAtPrice: variant.compare_at_price ? toNumber(variant.compare_at_price) : null, image: variant.featured_image?.src ?? null }));
  const firstAvailable = variants.find((variant) => variant.available) ?? variants[0];
  const price = firstAvailable?.price ?? 0;
  return { id: product.id, slug: product.handle, name: product.title, shortName: shortName(product.title), price, originalPrice: firstAvailable?.compareAtPrice ?? price, image: product.images[0]?.src ?? firstAvailable?.image ?? "", images: product.images.map((image) => ({ src: image.src, alt: image.alt ?? product.title })), description: plainText(product.body_html), tags: product.tags, options: product.options.map((option) => ({ name: option.name, values: option.values })), variants };
}

export const products = rawProducts.map(normaliseProduct);
export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
