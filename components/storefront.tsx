import Link from "next/link";
import { products } from "@/lib/products";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import styles from "./storefront.module.css";

function Price({ price, originalPrice }: { price: number; originalPrice: number }) {
  return <p className={styles.price}><s>${originalPrice.toFixed(2)} USD</s><strong>${price.toFixed(2)} USD</strong></p>;
}

function ProductRail({ railProducts }: { railProducts: typeof products }) {
  return <div className={styles.productRail}>
    {railProducts.map((product) => {
      const discount = Math.max(0, Math.round((1 - product.price / product.originalPrice) * 100));
      const alternateImage = product.images[1]?.src ?? product.image;
      return <Link href={`/products/${product.slug}`} className={styles.productCard} key={product.slug}>
        <div className={styles.productImage}>
          {discount > 0 && <span className={styles.salePill}>{discount}% OFF</span>}
          <img className={styles.primaryProductImage} src={product.image} alt={product.name} />
          <img className={styles.hoverProductImage} src={alternateImage} alt="" aria-hidden="true" />
        </div>
        <div className={styles.productMeta}><h3>{product.name}</h3><span className={styles.stars}>★★★★★ <small>4.8</small></span><Price price={product.price} originalPrice={product.originalPrice} /></div>
      </Link>;
    })}
  </div>;
}

export default function Storefront() {
  const mascotProducts = products.slice(3, 15);
  const arrivalProducts = products.slice(0, 12);
  const funLabels = ["STREET JERSEYS", "LONG SLEEVES JERSEY", "GRAPHIC TEE", "ACCESSORIES"];
  return (
    <main className={styles.storefront}>
      <div className={styles.heroWrap}><SiteHeader overlay /><section className={styles.hero} aria-label="Chaotic Club new arrivals"><img src="https://thechaoticclub.com/cdn/shop/files/Banner_Home_Chaoticclub-Picsart-AiImageEnhancer.png?v=1785400524&width=3000" alt="" /><Link href={`/products/${products[0].slug}`} className={styles.heroLink} aria-label="Shop the latest collection" /></section></div>
      <section className={styles.miniBanner}><img src="https://thechaoticclub.com/cdn/shop/files/BANNER_MINI_1.png?v=1785808534&width=1920" alt="Back to school collection" /></section>

      <section className={styles.shopSection} id="shop">
        <div className={styles.collectionTabs}><div><span className={styles.activeTab}>MASCOT</span><span>HALLOWEEN</span></div><Link href="/products">VIEW ALL <b>↗</b></Link></div>
        <ProductRail railProducts={mascotProducts} />
      </section>

      <section className={styles.funThings} id="fun"><h2>FUN THINGS</h2><div>{products.slice(18, 22).map((product, index) => <Link href={`/products/${product.slug}`} key={product.slug}><img src={product.images[1]?.src ?? product.image} alt=""/><h3>{funLabels[index]}</h3></Link>)}</div></section>

      <section className={styles.shopSection} id="arrivals">
        <div className={styles.collectionTabs}><div><span className={styles.activeTab}>NEW ARRIVALS</span><span>TOP PICKS</span></div><Link href="/products">VIEW ALL <b>↗</b></Link></div>
        <ProductRail railProducts={arrivalProducts} />
      </section>

      <section className={styles.themeBanner} id="halloween"><div><p>MAKE IT YOURS</p><h2>JERSEYS<br/>WITH A<br/><em>CHAOTIC</em><br/>TWIST.</h2><Link href={`/products/${products[4].slug}`}>SHOP JERSEYS ↗</Link></div><img src={products[4].images[1]?.src ?? products[4].image} alt=""/></section>
      <SiteFooter />
    </main>
  );
}
