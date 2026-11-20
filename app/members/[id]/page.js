import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query, callProcedure } from '@/lib/mysql';
import { formatDate } from '@/lib/format';
import Notice from '@/components/Notice';
import ConfirmButton from '@/components/ConfirmButton';
import { deleteMember, generateRecommendations } from '../actions';

export default async function MemberPage({ params, searchParams }) {
  const { id } = await params;
  const notice = await searchParams;
  const userId = Number(id);
  if (!Number.isInteger(userId)) notFound();

  // SQL: the member row (the password hash is not selected)
  const [member] = await query(
    `SELECT user_id, name, email, phone, role, register_date
     FROM   users
     WHERE  user_id = ?`,
    [userId]
  );
  if (!member) notFound();

  // SQL: borrowing history through the stored procedure
  const history = await callProcedure('CALL sp_user_history(?)', [userId]);

  // SQL: totals for this member (aggregate functions with CASE and a function)
  const [totals] = await query(
    `SELECT COUNT(*)                                                 AS borrowed,
            COALESCE(SUM(CASE WHEN status = 'ISSUED' THEN 1 END), 0) AS holding,
            COALESCE(SUM(CASE WHEN status = 'RETURNED'
                              THEN fn_calculate_fine(due_date, return_date) END), 0) AS fines
     FROM   borrowings
     WHERE  user_id = ?`,
    [userId]
  );

  // SQL: recommendations stored for this member (recommendations JOIN the catalogue view)
  const recommendations = await query(
    `SELECT r.recommendation_id, r.reason, r.recommended_date,
            v.book_id, v.title, v.authors, v.available_copies
     FROM   recommendations r
     JOIN   vw_book_catalogue v ON v.book_id = r.book_id
     WHERE  r.user_id = ?
     ORDER BY r.recommendation_id`,
    [userId]
  );

  // SQL: reviews written by this member
  const reviews = await query(
    `SELECT r.review_id, r.rating, r.review_text, r.review_date, b.book_id, b.title
     FROM   reviews r
     JOIN   books b ON b.book_id = r.book_id
     WHERE  r.user_id = ?
     ORDER BY r.review_date DESC`,
    [userId]
  );

  return (
    <>
      <p className="crumb"><Link href="/members">Members</Link> / {member.name}</p>

      <div className="page-head">
        <h1>{member.name}</h1>
        <p className="sub">{member.role}</p>
      </div>

      <Notice params={notice} />

      <div className="grid-2">
        <section className="card">
          <h2>Details</h2>
          <dl className="details">
            <dt>Email</dt><dd>{member.email}</dd>
            <dt>Phone</dt><dd>{member.phone || '—'}</dd>
            <dt>Role</dt><dd>{member.role}</dd>
            <dt>Registered</dt><dd>{formatDate(member.register_date)}</dd>
          </dl>
        </section>

        <section className="card">
          <h2>Summary</h2>
          <dl className="details">
            <dt>Books borrowed</dt><dd>{totals.borrowed}</dd>
            <dt>Holding now</dt><dd>{totals.holding} of 3 allowed</dd>
            <dt>Fines on late returns</dt><dd>₹{Number(totals.fines).toFixed(2)}</dd>
          </dl>
          <form action={deleteMember} className="form-row danger-zone">
            <input type="hidden" name="user_id" value={member.user_id} />
            <ConfirmButton className="btn btn-danger" message={`Remove ${member.name} from the library?`}>
              Remove member
            </ConfirmButton>
            <span className="hint">Only possible when the member has no borrowing records.</span>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Recommended books <span className="count">{recommendations.length}</span></h2>
        {recommendations.length === 0 ? (
          <p className="empty">No recommendations yet. Generate them from this member's borrowing history.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Authors</th>
                  <th>Why</th>
                  <th className="num">Available</th>
                  <th>Recommended</th>
                </tr>
              </thead>
              <tbody>
                {recommendations.map((row) => (
                  <tr key={row.recommendation_id}>
                    <td><Link href={`/books/${row.book_id}`}>{row.title}</Link></td>
                    <td>{row.authors || '—'}</td>
                    <td>{row.reason}</td>
                    <td className="num">{row.available_copies}</td>
                    <td>{formatDate(row.recommended_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form action={generateRecommendations} className="form-row card-foot">
          <input type="hidden" name="user_id" value={member.user_id} />
          <button type="submit" className="btn">
            {recommendations.length === 0 ? 'Generate recommendations' : 'Refresh recommendations'}
          </button>
          <span className="hint">
            Suggests available books from the categories this member borrows, then popular titles.
          </span>
        </form>
      </section>

      <section className="card">
        <h2>Borrowing history <span className="count">{history.length}</span></h2>
        {history.length === 0 ? (
          <p className="empty">This member has not borrowed any book.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
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
                    <td><Link href={`/books/${row.book_id}`}>{row.title}</Link></td>
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
        <h2>Reviews written <span className="count">{reviews.length}</span></h2>
        {reviews.length === 0 ? (
          <p className="empty">This member has not reviewed any book.</p>
        ) : (
          <ul className="reviews">
            {reviews.map((review) => (
              <li key={review.review_id}>
                <div className="review-head">
                  <strong><Link href={`/books/${review.book_id}`}>{review.title}</Link></strong>
                  <span className="chip">{review.rating} / 5</span>
                  <time>{formatDate(review.review_date)}</time>
                </div>
                {review.review_text ? <p>{review.review_text}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
