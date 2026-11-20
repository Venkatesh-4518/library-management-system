const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-11-10' -> '10 Nov 2026'
export function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

// JavaScript Date -> '10 Nov 2026, 19:32'
export function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 18 -> '₹18.00'
export function rupees(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

// Build a redirect URL that carries a one-line message for the next page.
export function withNotice(path, type, message) {
  return `${path}?${type}=${encodeURIComponent(message)}`;
}
