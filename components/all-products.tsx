"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { StoreProduct } from "@/lib/products";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import styles from "./storefront.module.css";

type SortOption = "featured" | "price-asc" | "price-desc" | "name";

function Price({ price, originalPrice }: { price: number; originalPrice: number }) {
  return (
    <p className={styles.price}>
      {originalPrice > price && <s>${originalPrice.toFixed(2)} USD</s>}
      <strong className={originalPrice <= price ? styles.regularPrice : undefined}>${price.toFixed(2)} USD</strong>
    </p>
  );
}

function ProductCard({ product }: { product: StoreProduct }) {
  const discount = product.originalPrice > product.price
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;
  const alternateImage = product.images[1]?.src ?? product.image;

  return (
    <Link prefetch={false} href={`/products/${product.slug}`} className={styles.productCard}>
      <div className={styles.productImage}>
        {discount > 0 && <span className={styles.salePill}>{discount}% OFF</span>}
        {product.image ? (
          <>
            <img className={styles.primaryProductImage} src={product.image} alt={product.name} loading="lazy" />
            <img className={styles.hoverProductImage} src={alternateImage} alt="" aria-hidden="true" loading="lazy" />
          </>
        ) : (
          <span className={styles.productImageFallback}>CHAOTIC CLUB</span>
        )}
      </div>
      <div className={styles.productMeta}>
        <h2>{product.name}</h2>
        <span className={styles.stars}>★★★★★ <small>4.8</small></span>
        <Price price={product.price} originalPrice={product.originalPrice} />
      </div>
    </Link>
  );
}

export default function AllProducts({ products }: { products: StoreProduct[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("featured");
  const [tag, setTag] = useState("all");

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    products.flatMap((product) => product.tags).forEach((productTag) => {
      const cleanTag = productTag.trim();
      if (cleanTag) counts.set(cleanTag, (counts.get(cleanTag) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase();
    const filtered = products.filter((product) => {
      const matchesTag = tag === "all" || product.tags.some((productTag) => productTag === tag);
      const haystack = `${product.name} ${product.description} ${product.tags.join(" ")}`.toLocaleLowerCase();
      return matchesTag && (!normalisedQuery || haystack.includes(normalisedQuery));
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [products, query, sort, tag]);

  return (
    <main className={styles.storefront}>
      <SiteHeader />
      <section className={styles.catalogueHero}>
        <p>SHOP THE WHOLE CLUB</p>
        <h1>ALL PRODUCTS</h1>
        <span>{products.length} STYLES FROM THE COMPLETE CATALOGUE</span>
      </section>

      <section className={styles.catalogueSection} aria-labelledby="catalogue-heading">
        <div className={styles.catalogueToolbar}>
          <div className={styles.catalogueTitle}>
            <span>COLLECTION</span>
            <h2 id="catalogue-heading">FIND YOUR CHAOS</h2>
          </div>
          <label className={styles.catalogueSearch}>
            <span>SEARCH</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, tag or keyword..." />
          </label>
          <label className={styles.catalogueSort}>
            <span>SORT BY</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name: A–Z</option>
            </select>
          </label>
        </div>

        <div className={styles.catalogueFilters} aria-label="Filter products by tag">
          <button type="button" className={tag === "all" ? styles.activeFilter : undefined} onClick={() => setTag("all")}>ALL <small>{products.length}</small></button>
          {tags.map(([productTag, count]) => (
            <button type="button" className={tag === productTag ? styles.activeFilter : undefined} onClick={() => setTag(productTag)} key={productTag}>
              {productTag.toUpperCase()} <small>{count}</small>
            </button>
          ))}
        </div>

        <p className={styles.catalogueResultCount} aria-live="polite">SHOWING {visibleProducts.length} OF {products.length} PRODUCTS</p>

        {visibleProducts.length > 0 ? (
          <div className={styles.catalogueGrid}>
            {visibleProducts.map((product) => <ProductCard product={product} key={product.slug} />)}
          </div>
        ) : (
          <div className={styles.catalogueEmpty}>
            <span>NO MATCHES</span>
            <h2>TRY A DIFFERENT SEARCH.</h2>
            <button type="button" onClick={() => { setQuery(""); setTag("all"); }}>VIEW ALL PRODUCTS</button>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
