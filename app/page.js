import Link from 'next/link';
import { query } from '@/lib/mysql';
import { mongoRead } from '@/lib/mongodb';
import { formatDate, formatDateTime } from '@/lib/format';

export default async function DashboardPage() {
  // SQL: six counts in one round trip, each from a scalar subquery
  const [stats] = await query(`
    SELECT
      (SELECT COUNT(*)                           FROM books) AS titles,
      (SELECT COALESCE(SUM(total_copies), 0)     FROM books) AS copies,
      (SELECT COALESCE(SUM(available_copies), 0) FROM books) AS available,
      (SELECT COUNT(*) FROM users WHERE role <> 'librarian') AS members,
      (SELECT COUNT(*) FROM borrowings WHERE status = 'ISSUED') AS issued,
      (SELECT COUNT(*) FROM borrowings
        WHERE status = 'ISSUED' AND due_date < CURDATE())    AS overdue
  `);

  // SQL: overdue books from the view, with today's fine from the function
  const overdue = await query(`
    SELECT borrowing_id, book_id, title, user_id, member_name, due_date, days_overdue,
           fn_calculate_fine(due_date, CURDATE()) AS fine_today
    FROM   vw_active_borrowings
    WHERE  days_overdue > 0
    ORDER BY days_overdue DESC
  `);

  // SQL: most borrowed books (JOIN + GROUP BY)
  const popular = await query(`
    SELECT b.book_id, b.title, COUNT(*) AS times_borrowed
    FROM   borrowings br
    JOIN   books b ON b.book_id = br.book_id
    GROUP BY b.book_id, b.title
    ORDER BY times_borrowed DESC, b.title
    LIMIT 5
  `);

  // SQL: best rated books (JOIN + GROUP BY + aggregate)
  const topRated = await query(`
    SELECT b.book_id, b.title, ROUND(AVG(r.rating), 1) AS average_rating, COUNT(*) AS reviews
    FROM   reviews r
    JOIN   books b ON b.book_id = r.book_id
    GROUP BY b.book_id, b.title
    ORDER BY average_rating DESC, reviews DESC, b.title
    LIMIT 5
  `);

  // MongoDB: the five latest entries of the activity log
  const recent = await mongoRead((db) =>
    db.collection('activity_logs').find().sort({ at: -1 }).limit(5).toArray()
  );

  const tiles = [
    { label: 'Book titles', value: stats.titles },
    { label: 'Total copies', value: stats.copies },
    { label: 'Available now', value: stats.available },
    { label: 'Members', value: stats.members },
    { label: 'Books issued', value: stats.issued },
    { label: 'Overdue', value: stats.overdue, warn: Number(stats.overdue) > 0 },
  ];

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
        <p className="sub">The state of the library right now.</p>
      </div>

      <section className="tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className={tile.warn ? 'tile tile-warn' : 'tile'}>
            <span className="tile-value">{tile.value}</span>
            <span className="tile-label">{tile.label}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Overdue books</h2>
        {overdue.length === 0 ? (
          <p className="empty">Nothing is overdue.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Due</th>
                  <th className="num">Days late</th>
                  <th className="num">Fine today</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((row) => (
                  <tr key={row.borrowing_id}>
                    <td><Link href={`/books/${row.book_id}`}>{row.title}</Link></td>
                    <td><Link href={`/members/${row.user_id}`}>{row.member_name}</Link></td>
                    <td>{formatDate(row.due_date)}</td>
                    <td className="num">{row.days_overdue}</td>
                    <td className="num">₹{row.fine_today}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="card-foot"><Link href="/borrowings">Go to Issue / Return</Link></p>
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Most borrowed books</h2>
          {popular.length === 0 ? (
            <p className="empty">No book has been issued yet.</p>
          ) : (
            <ol className="rank">
              {popular.map((row) => (
                <li key={row.book_id}>
                  <Link href={`/books/${row.book_id}`}>{row.title}</Link>
                  <span className="rank-count">{row.times_borrowed} borrowed</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <h2>Best rated books</h2>
          {topRated.length === 0 ? (
            <p className="empty">No reviews yet.</p>
          ) : (
            <ol className="rank">
              {topRated.map((row) => (
                <li key={row.book_id}>
                  <Link href={`/books/${row.book_id}`}>{row.title}</Link>
                  <span className="rank-count">
                    {row.average_rating} / 5 · {row.reviews} review{row.reviews === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Recent activity <span className="tag">MongoDB</span></h2>
        {recent === null ? (
          <p className="empty">MongoDB is not connected, so the activity log is unavailable.</p>
        ) : recent.length === 0 ? (
          <p className="empty">No activity recorded yet.</p>
        ) : (
          <ul className="feed">
            {recent.map((entry) => (
              <li key={String(entry._id)}>
                <span className="chip">{entry.action.replaceAll('_', ' ')}</span>
                <span className="feed-text">
                  {entry.details?.title || entry.details?.name || ''}
                  {entry.details?.member ? ` · ${entry.details.member}` : ''}
                </span>
                <time className="feed-time">{formatDateTime(entry.at)}</time>
              </li>
            ))}
          </ul>
        )}
        <p className="card-foot"><Link href="/activity">Open the full log</Link></p>
      </section>
    </>
  );
}
