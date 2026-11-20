
import Link from 'next/link';
import { loginUser } from '@/app/auth/actions';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;

  return (
    <main className="auth-container">
      <section className="auth-card">
        <h1>Library Management System</h1>
        <h2>Welcome Back</h2>
        <p>Sign in to access your library account.</p>

        {params?.registered && (
          <p className="success-message">
            Registration successful! Please log in.
          </p>
        )}

        {params?.error && (
          <p className="error-message">{params.error}</p>
        )}

        <form action={loginUser}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder="Enter your email"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Enter your password"
            required
          />

          <button type="submit">Login</button>
        </form>

        <p>
          New student? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
