// Shows the one-line result of the last form submission.
// Server actions redirect back with ?ok=... or ?error=... in the URL.
export default function Notice({ params }) {
  if (params?.error) {
    return (
      <p className="notice notice-error" role="alert">
        {params.error}
      </p>
    );
  }
  if (params?.ok) {
    return (
      <p className="notice notice-ok" role="status">
        {params.ok}
      </p>
    );
  }
  return null;
}
