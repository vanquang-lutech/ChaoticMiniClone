import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin login | Chaotic Custom Studio" };

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const errorMessage = error === "config"
    ? "Admin authentication has not been configured correctly."
    : error === "invalid" ? "Username or password is incorrect." : null;

  return (
    <main className="adminAuthPage">
      <section className="adminAuthCard" aria-labelledby="admin-login-title">
        <p className="adminEyebrow">Chaotic Custom Studio</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        <p>Sign in to access token usage and storage management.</p>
        {errorMessage && <p className="adminError" role="alert">{errorMessage}</p>}
        <form action="/api/admin/login" method="post" className="adminLoginForm">
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Sign in</button>
        </form>
        <Link href="/">Back to studio</Link>
      </section>
    </main>
  );
}
