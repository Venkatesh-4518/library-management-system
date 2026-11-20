import Link from 'next/link';
import { query } from '@/lib/mysql';
import { formatDate } from '@/lib/format';
import Notice from '@/components/Notice';
import { issueBook, returnBook } from './actions';

export default async function BorrowingsPage({ searchParams }) {
  const params = await searchParams;

  // SQL: members for the dropdown, with how many books each holds
  const members = await query(`
    SELECT u.user_id, u.name, u.role, COUNT(br.borrowing_id) AS books_held
    FROM   users u
    LEFT JOIN borrowings br ON br.user_id = u.user_id AND br.status = 'ISSUED'
    WHERE  u.role <> 'librarian'
    GROUP BY u.user_id, u.name, u.role
    ORDER BY u.name
  `);

  // SQL: every book for the dropdown; titles with no free copy stay
  // listed so the trigger's "no copies" rule can be shown in the demo
  const books = await query(`
    SELECT book_id, title, available_copies
    FROM   books
    ORDER BY title
  `);

  // SQL: books currently out, read from the view
  const active = await query(`
    SELECT borrowing_id, book_id, title, user_id, member_name,
           issue_date, due_date, days_overdue,
           fn_calculate_fine(due_date, CURDATE()) AS fine_today
    FROM   vw_active_borrowings
    ORDER BY due_date
  `);

  // SQL: the ten most recent returns (3-table join + function)
  const returned = await query(`
    SELECT br.borrowing_id, b.book_id, b.title, u.user_id, u.name AS member_name,
           br.issue_date, br.due_date, br.return_date,
           fn_calculate_fine(br.due_date, br.return_date) AS fine_amount
    FROM   borrowings br
    JOIN   books b ON b.book_id = br.book_id
    JOIN   users u ON u.user_id = br.user_id
    WHERE  br.status = 'RETURNED'
    ORDER BY br.return_date DESC, br.borrowing_id DESC
    LIMIT 10
  `);

  return (
    <>
      <div className="page-head">
        <h1>Issue / Return</h1>
        <p className="sub">
          A loan runs 14 days. A member can hold 3 books. Late returns are fined ₹2 a day.
        </p>
      </div>

      <Notice params={params} />

      <section className="card">
        <h2>Issue a book</h2>
        <form action={issueBook} className="form-row">
          <label className="field grow">
            <span>Member</span>
            <select name="user_id" required defaultValue="">
              <option value="" disabled>Choose a member…</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.name} ({m.role}) · holds {m.books_held}
                </option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span>Book</span>
            <select name="book_id" required defaultValue="">
              <option value="" disabled>Choose a book…</option>
              {books.map((b) => (
                <option key={b.book_id} value={b.book_id}>
                  {b.title} · {b.available_copies} available
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn">Issue book</button>
        </form>
      </section>

      <section className="card">
        <h2>Currently issued <span className="count">{active.length}</span></h2>
        {active.length === 0 ? (
          <p className="empty">No books are out.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {active.map((row) => (
                  <tr key={row.borrowing_id}>
                    <td><Link href={`/books/${row.book_id}`}>{row.title}</Link></td>
                    <td><Link href={`/members/${row.user_id}`}>{row.member_name}</Link></td>
                    <td>{formatDate(row.issue_date)}</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>
                      {row.days_overdue > 0 ? (
                        <span className="chip chip-danger">
                          {row.days_overdue} day{row.days_overdue === 1 ? '' : 's'} late · ₹{row.fine_today}
                        </span>
                      ) : (
                        <span className="chip chip-ok">On time</span>
                      )}
                    </td>
                    <td className="actions">
                      <form action={returnBook}>
                        <input type="hidden" name="borrowing_id" value={row.borrowing_id} />
                        <button type="submit" className="btn btn-small">Return</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Recently returned</h2>
        {returned.length === 0 ? (
          <p className="empty">No books have been returned yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Member</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Returned</th>
                  <th className="num">Fine</th>
                </tr>
              </thead>
              <tbody>
                {returned.map((row) => (
                  <tr key={row.borrowing_id}>
                    <td><Link href={`/books/${row.book_id}`}>{row.title}</Link></td>
                    <td><Link href={`/members/${row.user_id}`}>{row.member_name}</Link></td>
                    <td>{formatDate(row.issue_date)}</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatDate(row.return_date)}</td>
                    <td className="num">₹{row.fine_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
