import { query } from '@/lib/mysql';
import DataTable from '@/components/DataTable';

// Each report is one SQL statement. The page shows the statement and,
// under it, the rows MySQL returns for it right now.
const REPORTS = [
  {
    kind: 'Join',
    title: 'Books currently issued, with member and due date',
    sql: `SELECT  br.borrowing_id, b.title, u.name, u.email, br.issue_date, br.due_date
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
JOIN    users u ON u.user_id = br.user_id
WHERE   br.status = 'ISSUED'
ORDER BY br.due_date`,
  },
  {
    kind: 'View + Function',
    title: 'Overdue books and the fine if returned today',
    sql: `SELECT  borrowing_id, title, member_name, due_date, days_overdue,
        fn_calculate_fine(due_date, CURDATE()) AS fine_if_returned_today
FROM    vw_active_borrowings
WHERE   days_overdue > 0
ORDER BY days_overdue DESC`,
  },
  {
    kind: 'Left join',
    title: 'Books held by every member, including those holding none',
    sql: `SELECT  u.name, u.role, COUNT(br.borrowing_id) AS books_held
FROM    users u
LEFT JOIN borrowings br
       ON br.user_id = u.user_id AND br.status = 'ISSUED'
WHERE   u.role <> 'librarian'
GROUP BY u.user_id, u.name, u.role
ORDER BY books_held DESC, u.name`,
  },
  {
    kind: 'Many-to-many join',
    title: 'Books in the Databases category with their authors',
    sql: `SELECT  b.title, a.author_name
FROM    books b
JOIN    book_categories bc ON bc.book_id    = b.book_id
JOIN    categories c       ON c.category_id = bc.category_id
JOIN    book_authors ba    ON ba.book_id    = b.book_id
JOIN    authors a          ON a.author_id   = ba.author_id
WHERE   c.category_name = 'Databases'
ORDER BY b.title, a.author_id`,
  },
  {
    kind: 'Aggregate',
    title: 'Most borrowed books',
    sql: `SELECT  b.title, COUNT(*) AS times_borrowed
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
GROUP BY b.book_id, b.title
ORDER BY times_borrowed DESC, b.title
LIMIT 5`,
  },
  {
    kind: 'Aggregate',
    title: 'Titles, copies and availability per category',
    sql: `SELECT  c.category_name,
        COUNT(b.book_id)                     AS titles,
        COALESCE(SUM(b.total_copies), 0)     AS total_copies,
        COALESCE(SUM(b.available_copies), 0) AS available_copies
FROM    categories c
LEFT JOIN book_categories bc ON bc.category_id = c.category_id
LEFT JOIN books b            ON b.book_id      = bc.book_id
GROUP BY c.category_id, c.category_name
ORDER BY titles DESC, c.category_name`,
  },
  {
    kind: 'Aggregate + Having',
    title: 'Books rated 4 or above on average',
    sql: `SELECT  b.title,
        ROUND(AVG(r.rating), 1) AS average_rating,
        COUNT(*)                AS reviews
FROM    reviews r
JOIN    books b ON b.book_id = r.book_id
GROUP BY b.book_id, b.title
HAVING  AVG(r.rating) >= 4
ORDER BY average_rating DESC, reviews DESC`,
  },
  {
    kind: 'Aggregate + Function',
    title: 'Late returns and fines per member',
    sql: `SELECT  u.name,
        COUNT(*) AS late_returns,
        SUM(fn_calculate_fine(br.due_date, br.return_date)) AS total_fine
FROM    borrowings br
JOIN    users u ON u.user_id = br.user_id
WHERE   br.status = 'RETURNED' AND br.return_date > br.due_date
GROUP BY u.user_id, u.name
ORDER BY total_fine DESC`,
  },
  {
    kind: 'Nested',
    title: 'Members who have never borrowed a book',
    sql: `SELECT name, email, role
FROM   users
WHERE  role <> 'librarian'
  AND  user_id NOT IN (SELECT user_id FROM borrowings)`,
  },
  {
    kind: 'Nested',
    title: 'Books borrowed more often than the average book',
    sql: `SELECT  b.title, COUNT(*) AS times_borrowed
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
GROUP BY b.book_id, b.title
HAVING  COUNT(*) > (SELECT COUNT(*) / COUNT(DISTINCT book_id) FROM borrowings)`,
  },
  {
    kind: 'Correlated',
    title: 'Books that have never been borrowed',
    sql: `SELECT  b.title
FROM    books b
WHERE   NOT EXISTS (SELECT 1 FROM borrowings br WHERE br.book_id = b.book_id)`,
  },
  {
    kind: 'Nested (two levels)',
    title: 'Members who borrowed a book from the Databases category',
    sql: `SELECT  name, email
FROM    users
WHERE   user_id IN (SELECT br.user_id
                    FROM   borrowings br
                    WHERE  br.book_id IN (SELECT bc.book_id
                                          FROM   book_categories bc
                                          JOIN   categories c ON c.category_id = bc.category_id
                                          WHERE  c.category_name = 'Databases'))`,
  },
];

export default async function ReportsPage() {
  // Run all the statements in parallel
  const results = await Promise.all(REPORTS.map((report) => query(report.sql)));

  return (
    <>
      <div className="page-head">
        <h1>SQL Reports</h1>
        <p className="sub">
          Join, aggregate and nested queries. Each block shows the SQL the page runs and its live result.
        </p>
      </div>

      {REPORTS.map((report, index) => (
        <section className="card" key={report.title}>
          <h2>
            {report.title} <span className="tag">{report.kind}</span>
          </h2>
          <pre className="code">{report.sql}</pre>
          <DataTable rows={results[index]} empty="The query returned no rows." />
        </section>
      ))}
    </>
  );
}
