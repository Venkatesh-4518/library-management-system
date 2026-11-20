'use client';

// Shown when a page cannot load, which almost always means MySQL is
// not running or the credentials in .env.local are wrong.
export default function Error({ error, reset }) {
  return (
    <section className="card">
      <h1>Could not load this page</h1>
      <p className="sub">
        The page could not read from the database. Check that MySQL is running, that the
        <code> library_db </code> database has been created from the files in
        <code> database/</code>, and that <code>.env.local</code> has the right user and password.
      </p>
      {error?.message ? <pre className="code">{error.message}</pre> : null}
      <button type="button" className="btn" onClick={() => reset()}>
        Try again
      </button>
    </section>
  );
}
