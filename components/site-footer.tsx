import Link from "next/link";
import styles from "./storefront.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div>
        <b>SHOP</b>
        <Link href="/#shop">BEST SELLER</Link>
        <Link href="/#arrivals">NEW ARRIVALS</Link>
        <Link href="/products">STREET JERSEYS🔥</Link>
        <Link href="/#fun">ACCESSORIES</Link>
        <Link href="/products">ALL PRODUCTS</Link>
      </div>
      <div>
        <b>ABOUT</b>
        <a href="#about">ABOUT US</a>
        <a href="#about">CONTACT US</a>
        <a href="#about">PRIVACY POLICY</a>
        <a href="#about">CUSTOMER SUPPORT</a>
      </div>
      <div>
        <b>SUPPORT</b>
        <a href="#about">FAQS</a>
        <a href="#about">RETURN &amp; REFUNDS</a>
        <a href="#about">REVIEW</a>
        <a href="#about">SHIPPING POLICY</a>
      </div>
      <div className={styles.subscribe}>
        <b>SUBSCRIBE TO OUR EMAILS</b>
        <p>Get the newest drops and chaotic inspiration first.</p>
        <form action="#">
          <input aria-label="Email address" placeholder="Enter email address..." />
          <button type="submit">SIGN UP</button>
        </form>
        <span>© 2026, CHAOTIC CLUB DEMO</span>
      </div>
    </footer>
  );
}
