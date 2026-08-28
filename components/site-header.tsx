import Link from "next/link";
import styles from "./storefront.module.css";

type SiteHeaderProps = { overlay?: boolean };

export function SiteHeader({ overlay = false }: SiteHeaderProps) {
  return (
    <>
      <div className={styles.announcement} aria-label="Store announcements">
        <div className={styles.announcementTrack}>
          <span>FREE SHIPPING ON 2+ ITEMS 🛍️</span><i>•</i><span>BUY 4 GET 1 FREE 🏷️</span><i>•</i><span>SHOP THE LOOK NOW ✨</span><i>•</i><span>NEW ARRIVALS DAILY 🌿</span><i>•</i>
          <span aria-hidden="true">FREE SHIPPING ON 2+ ITEMS 🛍️</span><i aria-hidden="true">•</i><span aria-hidden="true">BUY 4 GET 1 FREE 🏷️</span><i aria-hidden="true">•</i>
        </div>
      </div>
      <header className={`${styles.header} ${overlay ? styles.headerOverlay : ""}`}>
        <Link className={styles.brand} href="/" aria-label="Chaotic Club home"><img src="https://thechaoticclub.com/cdn/shop/files/logo_Chaotic_Club.png?v=1785484071&width=170" alt="Chaotic Club" /></Link>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/">HOME</Link><Link href="/#shop">BEST SELLER</Link><Link href="/#halloween">HALLOWEEN</Link><Link href="/products">MASCOT</Link><Link href="/products">JERSEYS</Link><Link href="/products">SHOP BY TYPES</Link><Link href="/#fun">ACCESSORIES</Link><Link href="/products">ALL PRODUCTS</Link><Link href="/#fun">BRAND</Link>
        </nav>
        <div className={styles.headerActions} aria-label="Store actions"><label className={styles.search}><span>⌕</span><input aria-label="Search" placeholder="Search" /></label><Link href="/#account" aria-label="Log in" className={styles.account}>♙</Link><Link href="/#cart" aria-label="Cart" className={styles.cart}>BAG <b>0</b></Link></div>
      </header>
    </>
  );
}
