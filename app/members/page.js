import Link from 'next/link';
import { query } from '@/lib/mysql';
import { formatDate } from '@/lib/format';
import Notice from '@/components/Notice';
import { addMember } from './actions';

const ROLES = ['student', 'faculty', 'librarian'];

export default async function MembersPage({ searchParams }) {
  const params = await searchParams;
  const q = (params.q || '').trim();

  // SQL: every user with the number of books held right now.
  // LEFT JOIN keeps users who hold nothing (COUNT gives 0 for them).
  // The password column is never selected.
  const members = await query(
    `SELECT u.user_id, u.name, u.email, u.phone, u.role, u.register_date,
            COUNT(br.borrowing_id) AS books_held
     FROM   users u
     LEFT JOIN borrowings br
            ON br.user_id = u.user_id AND br.status = 'ISSUED'
     WHERE  u.name LIKE ? OR u.email LIKE ? OR u.role LIKE ?
     GROUP BY u.user_id, u.name, u.email, u.phone, u.role, u.register_date
     ORDER BY u.name`,
    [`%${q}%`, `%${q}%`, `%${q}%`]
  );

  return (
    <>
      <div className="page-head">
        <h1>Members</h1>
        <p className="sub">Students, faculty and librarians registered with the library.</p>
      </div>

      <Notice params={params} />

      <section className="card">
        <h2>Search</h2>
        <form action="/members" method="get" className="form-row">
          <label className="field grow">
            <span>Name, email or role</span>
            <input type="search" name="q" defaultValue={q} placeholder="e.g. student" />
          </label>
          <button type="submit" className="btn">Search</button>
          {q ? <Link href="/members" className="btn btn-ghost">Clear</Link> : null}
        </form>
      </section>

      <section className="card">
        <h2>
          {q ? 'Search results' : 'All members'}
          <span className="count">{members.length}</span>
        </h2>
        {members.length === 0 ? (
          <p className="empty">No members match this search.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Registered</th>
                  <th className="num">Books held</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.user_id}>
                    <td><Link href={`/members/${member.user_id}`}>{member.name}</Link></td>
                    <td>{member.email}</td>
                    <td className="mono">{member.phone || '—'}</td>
                    <td><span className="chip">{member.role}</span></td>
                    <td>{formatDate(member.register_date)}</td>
                    <td className="num">{member.books_held} / 3</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Register a member</h2>
        <form action={addMember} className="form-grid">
          <label className="field span-2">
            <span>Name</span>
            <input name="name" required maxLength={100} />
          </label>
          <label className="field span-2">
            <span>Email</span>
            <input name="email" type="email" required maxLength={100} />
          </label>
          <label className="field">
            <span>Phone</span>
            <input name="phone" inputMode="numeric" pattern="[0-9]{10}" placeholder="10 digits" />
          </label>
          <label className="field">
            <span>Role</span>
            <select name="role" required defaultValue="student">
              {ROLES.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
          <label className="field span-2">
            <span>Password (at least 8 characters)</span>
            <input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn">Register member</button>
            <span className="hint">The password is stored as a salted hash, never as plain text.</span>
          </div>
        </form>
      </section>
    </>
  );
}
