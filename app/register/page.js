
import Link from 'next/link';
import { registerStudent } from '@/app/auth/actions';

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;

  return (
    <main className="auth-container">
      <section className="auth-card">
        <h1>Library Management System</h1>
        <h2>Create Student Account</h2>
        <p>Register to access library services.</p>

        {params?.error && (
          <p className="error-message">{params.error}</p>
        )}

        <form action={registerStudent}>
          <label htmlFor="name">Full Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your full name"
            required
          />

          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            required
          />

          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="Enter your phone number"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />

          <button type="submit">Register</button>
        </form>

        <p>
          Already registered? <Link href="/login">Login</Link>
        </p>
      </section>
    </main>
  );
}
