import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="card">
      <h1>Not found</h1>
      <p className="sub">There is no book, student or page at this address.</p>
      <p className="card-foot"><Link href="/">Back to the dashboard</Link></p>
    </section>
  );
}
