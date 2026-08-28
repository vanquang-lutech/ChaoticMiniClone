import catalogue from "@/data/back-to-school-products.json";

type RawImage = { src: string; alt?: string; variant_ids?: number[] };
type RawVariant = { id: number; title: string; option1: string | null; option2: string | null; option3: string | null; available: boolean; price: string; compare_at_price: string | null; featured_image?: RawImage | null };
type RawOption = { name: string; position: number; values: string[] };
type RawProduct = { id: number; title: string; handle: string; body_html: string; tags: string[]; images: RawImage[]; options: RawOption[]; variants: RawVariant[] };
type RawCatalogue = { products: RawProduct[] };

export type StoreVariant = { id: number; title: string; options: string[]; available: boolean; price: number; compareAtPrice: number | null; image: string | null };
export type StoreOption = { name: string; values: string[] };
export type CustomField = "school" | "mascot" | "name" | "number" | "color";
export type StoreProduct = { id: number; slug: string; name: string; shortName: string; price: number; originalPrice: number; image: string; images: Array<{ src: string; alt: string }>; description: string; tags: string[]; options: StoreOption[]; variants: StoreVariant[]; customFields: CustomField[] };

const rawProducts = (catalogue as RawCatalogue).products;
const toNumber = (value: string | null | undefined) => { const parsed = Number.parseFloat(value ?? ""); return Number.isFinite(parsed) ? parsed : 0; };
const plainText = (html: string) => html.replace(/<li[^>]*>/gi, "").replace(/<\/li>/gi, ". ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().replace(/\.$/, "");
const shortName = (title: string) => title.replace(/^Chaotic Club\s+/i, "").replace(/\s+Mesh Jersey$/i, "");

const customFieldOverrides: Record<string, CustomField[]> = {
  "chaoticclub-striped-neon-back-to-school-smiley-mesh-jersey": ["name", "number"],
  "chaoticclub-mascot-neon-striped-floral-mesh-jersey": ["school", "name", "number", "color"],
  "chaotic-club-retro-school-mascot-school-spirit-team-mesh-jersey": ["school", "name", "number", "color"],
  "chaotic-club-school-mascot-football-baseball-hockey-varsity-letters-mesh-jersey": ["school", "name", "number", "color"],
  "chaotic-club-personalized-school-spirit-mascot-mesh-jersey": ["school", "name", "number", "color"],
  "chaoticclub-mascot-school-spirit-striped-personalized-mesh-jersey": ["school", "name", "number", "color"],
  "chaotic-club-custom-school-mascot-stars-sports-mesh-jersey": ["school", "name", "number", "color"],
  "chaoticclub-mascot-neon-striped-game-day-mesh-jersey": ["name", "number", "color"],
  "chaoticclub-custom-gingham-school-mascot-game-day-retro-mesh-jersey": ["name", "number", "color"],
  "chaoticclub-mascot-neon-test-day-game-day-mesh-jersey": ["name", "number", "color"],
  "chaoticclub-funny-seagull-teacher-mesh-jersey": ["name"],
  "chaotic-club-helping-tiny-humans-do-big-things-mesh-jersey": ["name"],
  "chaotic-club-custom-teacher-name-red-apple-embroidery-quarter-zip-sweatshirt": ["name"],
  "chaotic-club-embroided-glitter-game-day-custom-star-number-quarter-zip-sweatshirt": ["name"],
  "chaotic-club-gingham-embroided-pennant-flag-mascot-quarter-zip-sweatshirt": ["school", "mascot", "name"],
};

function inferCustomFields(product: RawProduct): CustomField[] {
  const override = customFieldOverrides[product.handle];
  if (override) return override;

  const title = product.title.toLowerCase();
  const media = product.images.map((image) => image.src).join(" ").toLowerCase();
  const hasAnotherOption = product.options.some((option) => option.values.some((value) => /another\s*-?\s*pls\s+note\/dm/i.test(value)));
  const explicitlyCustom = /\b(custom|personalized|personalised)\b/.test(title);
  const hasNameArtwork = /\bcustom(?:-|_)name\b|\bpersonalized(?:-|_)name\b|\byour(?:-|_)name\b/.test(media);
  const hasNumberArtwork = /\bcustom(?:-|_)(?:your(?:-|_)?)?name(?:-|_)number\b|\byour(?:-|_)name(?:-|_)number\b|\bcustom(?:-|_)number\b/.test(media);

  if (hasAnotherOption || hasNumberArtwork || (explicitlyCustom && /mesh jersey|long sleeve jersey/i.test(product.title))) return ["name", "number"];
  if (hasNameArtwork || (explicitlyCustom && /\bname\b/.test(title))) return ["name"];
  return [];
}

function normaliseProduct(product: RawProduct): StoreProduct {
  const variants = product.variants.map((variant) => ({ id: variant.id, title: variant.title, options: [variant.option1, variant.option2, variant.option3].filter((value): value is string => Boolean(value)), available: variant.available, price: toNumber(variant.price), compareAtPrice: variant.compare_at_price ? toNumber(variant.compare_at_price) : null, image: variant.featured_image?.src ?? product.images.find((image) => image.variant_ids?.includes(variant.id))?.src ?? null }));
  const firstAvailable = variants.find((variant) => variant.available) ?? variants[0];
  const price = firstAvailable?.price ?? 0;
  return { id: product.id, slug: product.handle, name: product.title, shortName: shortName(product.title), price, originalPrice: firstAvailable?.compareAtPrice ?? price, image: product.images[0]?.src ?? firstAvailable?.image ?? "", images: product.images.map((image) => ({ src: image.src, alt: image.alt ?? product.title })), description: plainText(product.body_html), tags: product.tags, options: product.options.map((option) => ({ name: option.name, values: option.values })), variants, customFields: inferCustomFields(product) };
}

export const products = rawProducts.map(normaliseProduct);
export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
