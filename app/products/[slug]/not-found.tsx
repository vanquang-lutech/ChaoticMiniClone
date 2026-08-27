import Link from "next/link";

export default function ProductNotFound() {
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5efe5", fontFamily: "Arial, sans-serif", textAlign: "center" }}><div><p style={{ fontWeight: 800, letterSpacing: ".12em", fontSize: 12 }}>404</p><h1 style={{ fontSize: "clamp(46px, 9vw, 100px)", letterSpacing: "-.1em", margin: "0 0 24px" }}>NO JERSEY HERE.</h1><Link href="/" style={{ color: "#fff", background: "#121212", textDecoration: "none", padding: "15px 18px", fontSize: 12, fontWeight: 800, letterSpacing: ".08em" }}>BACK TO THE SHOP →</Link></div></main>;
}
