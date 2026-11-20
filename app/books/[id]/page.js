import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query } from '@/lib/mysql';
import { formatDate } from '@/lib/format';
import Notice from '@/components/Notice';
import ConfirmButton from '@/components/ConfirmButton';
import { updateCopies, deleteBook, addReview, deleteReview } from '../actions';

export default async function BookPage({ params, searchParams }) {
  const { id } = await params;
  const notice = await searchParams;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) notFound();

  // SQL: one book from the catalogue view, with its average rating
  const [book] = await query(
    `SELECT v.*, fn_average_rating(v.book_id) AS average_rating
     FROM   vw_book_catalogue v
     WHERE  v.book_id = ?`,
    [bookId]
  );
  if (!book) notFound();

  // SQL: authors of this book through the M:N table
  const authors = await query(
    `SELECT a.author_id, a.author_name, a.biography
     FROM   book_authors ba
     JOIN   authors a ON a.author_id = ba.author_id
     WHERE  ba.book_id = ?
     ORDER BY a.author_id`,
    [bookId]
  );

  // SQL: full borrowing history of this book (borrowings JOIN users)
  const history = await query(
    `SELECT br.borrowing_id, u.user_id, u.name, br.issue_date, br.due_date,
            br.return_date, br.status,
            fn_calculate_fine(br.due_date, COALESCE(br.return_date, CURDATE())) AS fine_amount
     FROM   borrowings br
     JOIN   users u ON u.user_id = br.user_id
     WHERE  br.book_id = ?
     ORDER BY br.issue_date DESC, br.borrowing_id DESC`,
    [bookId]
  );

  // SQL: reviews of this book (reviews JOIN users)
  const reviews = await query(
    `SELECT r.review_id, r.rating, r.review_text, r.review_date, u.user_id, u.name
     FROM   reviews r
     JOIN   users u ON u.user_id = r.user_id
     WHERE  r.book_id = ?
     ORDER BY r.review_date DESC, r.review_id DESC`,
    [bookId]
  );

  // SQL: members for the review form
  const members = await query(
    `SELECT user_id, name, role FROM users WHERE role <> 'librarian' ORDER BY name`
  );

  return (
    <>
      <p className="crumb"><Link href="/books">Books</Link> / {book.title}</p>

      <div className="page-head">
        <h1>{book.title}</h1>
        <p className="sub">{book.authors || 'No author recorded'}</p>
      </div>

      <Notice params={notice} />

      <div className="grid-2">
        <section className="card">
          <h2>Details</h2>
          <dl className="details">
            <dt>ISBN</dt><dd className="mono">{book.isbn || '—'}</dd>
            <dt>Categories</dt><dd>{book.categories || '—'}</dd>
            <dt>Publisher</dt><dd>{book.publisher || '—'}</dd>
            <dt>Year</dt><dd>{book.publication_year || '—'}</dd>
            <dt>Copies</dt>
            <dd>
              {book.available_copies} available of {book.total_copies}
              {' '}({book.issued_copies} issued)
            </dd>
            <dt>Rating</dt>
            <dd>
              {book.average_rating
                ? `${book.average_rating} / 5 from ${reviews.length} review${reviews.length === 1 ? '' : 's'}`
                : 'No reviews yet'}
            </dd>
          </dl>
        </section>

        <section className="card">
          <h2>Manage</h2>
          <form action={updateCopies} className="form-row">
            <input type="hidden" name="book_id" value={book.book_id} />
            <label className="field">
              <span>Total copies</span>
              <input name="total_copies" type="number" min="0" max="999" defaultValue={book.total_copies} required />
            </label>
            <button type="submit" className="btn">Update copies</button>
          </form>
          <form action={deleteBook} className="form-row danger-zone">
            <input type="hidden" name="book_id" value={book.book_id} />
            <ConfirmButton className="btn btn-danger" message={`Delete "${book.title}" from the catalogue?`}>
              Delete book
            </ConfirmButton>
            <span className="hint">Only possible when the book has no borrowing records.</span>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Authors <span className="count">{authors.length}</span></h2>
        {authors.length === 0 ? (
          <p className="empty">No author is linked to this book.</p>
        ) : (
          <ul className="plain">
            {authors.map((author) => (
              <li key={author.author_id}>
                <strong>{author.author_name}</strong>
                {author.biography ? <span className="dim"> · {author.biography}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Borrowing history <span className="count">{history.length}</span></h2>
        {history.length === 0 ? (
          <p className="empty">This book has never been issued.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Returned</th>
                  <th className="num">Fine</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.borrowing_id}>
                    <td><Link href={`/members/${row.user_id}`}>{row.name}</Link></td>
                    <td>{formatDate(row.issue_date)}</td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{formatDate(row.return_date)}</td>
                    <td className="num">₹{row.fine_amount}</td>
                    <td>
                      {row.status === 'ISSUED' ? (
                        <span className="chip chip-warn">Issued</span>
                      ) : (
                        <span className="chip chip-ok">Returned</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Reviews <span className="count">{reviews.length}</span></h2>
        {reviews.length === 0 ? (
          <p className="empty">No reviews yet.</p>
        ) : (
          <ul className="reviews">
            {reviews.map((review) => (
              <li key={review.review_id}>
                <div className="review-head">
                  <strong><Link href={`/members/${review.user_id}`}>{review.name}</Link></strong>
                  <span className="chip">{review.rating} / 5</span>
                  <time>{formatDate(review.review_date)}</time>
                </div>
                {review.review_text ? <p>{review.review_text}</p> : null}
                <div className="review-foot">
                  <form action={deleteReview}>
                    <input type="hidden" name="book_id" value={book.book_id} />
                    <input type="hidden" name="review_id" value={review.review_id} />
                    <ConfirmButton className="link-btn" message="Delete this review?">Delete</ConfirmButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3>Write a review</h3>
        <form action={addReview} className="form-grid">
          <input type="hidden" name="book_id" value={book.book_id} />
          <label className="field span-2">
            <span>Member</span>
            <select name="user_id" required defaultValue="">
              <option value="" disabled>Choose…</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Rating</span>
            <select name="rating" required defaultValue="5">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} / 5</option>
              ))}
            </select>
          </label>
          <label className="field span-4">
            <span>Review</span>
            <textarea name="review_text" rows={3} maxLength={500} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn">Save review</button>
            <span className="hint">A member can review a book once, and only after borrowing it.</span>
          </div>
        </form>
      </section>
    </>
  );
}
