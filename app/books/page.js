import Link from 'next/link';
import { query } from '@/lib/mysql';
import { logSearch } from '@/lib/mongodb';
import Notice from '@/components/Notice';
import { addBook } from './actions';

export default async function BooksPage({ searchParams }) {
  const params = await searchParams;
  const q = (params.q || '').trim();
  const category = params.category || '';
  const onlyAvailable = params.available === '1';

  // SQL: search the catalogue view. The WHERE clause grows with the
  // filters the user picked; every value is bound as a ? parameter.
  const conditions = [];
  const values = [];
  if (q) {
    conditions.push('(title LIKE ? OR authors LIKE ? OR isbn LIKE ?)');
    values.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    // nested query: books linked to the chosen category
    conditions.push('book_id IN (SELECT book_id FROM book_categories WHERE category_id = ?)');
    values.push(category);
  }
  if (onlyAvailable) {
    conditions.push('available_copies > 0');
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const books = await query(
    `SELECT book_id, title, authors, categories, isbn, total_copies, available_copies,
            fn_average_rating(book_id) AS average_rating
     FROM   vw_book_catalogue
     ${where}
     ORDER BY title`,
    values
  );

  // SQL: categories for the filter and for the add-book form
  const categories = await query(
    'SELECT category_id, category_name FROM categories ORDER BY category_name'
  );

  // MongoDB: remember what was searched and how many books it found
  if (q) {
    const chosen = categories.find((c) => String(c.category_id) === category);
    await logSearch({
      query: q,
      category: chosen?.category_name,
      availableOnly: onlyAvailable,
      results: books.length,
    });
  }

  const filtered = Boolean(q || category || onlyAvailable);

  return (
    <>
      <div className="page-head">
        <h1>Books</h1>
        <p className="sub">Search the catalogue, check availability and add new titles.</p>
      </div>

      <Notice params={params} />

      <section className="card">
        <h2>Search</h2>
        <form action="/books" method="get" className="form-row">
          <label className="field grow">
            <span>Title, author or ISBN</span>
            <input type="search" name="q" defaultValue={q} placeholder="e.g. database" />
          </label>
          <label className="field">
            <span>Category</span>
            <select name="category" defaultValue={category}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
              ))}
            </select>
          </label>
          <label className="check">
            <input type="checkbox" name="available" value="1" defaultChecked={onlyAvailable} />
            <span>Available only</span>
          </label>
          <button type="submit" className="btn">Search</button>
          {filtered ? <Link href="/books" className="btn btn-ghost">Clear</Link> : null}
        </form>
      </section>

      <section className="card">
        <h2>
          {filtered ? 'Search results' : 'All books'}
          <span className="count">{books.length}</span>
        </h2>
        {books.length === 0 ? (
          <p className="empty">No books match this search.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Authors</th>
                  <th>Categories</th>
                  <th>ISBN</th>
                  <th className="num">Available</th>
                  <th>Rating</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.book_id}>
                    <td><Link href={`/books/${book.book_id}`}>{book.title}</Link></td>
                    <td>{book.authors || '—'}</td>
                    <td>{book.categories || '—'}</td>
                    <td className="mono">{book.isbn}</td>
                    <td className="num">{book.available_copies} / {book.total_copies}</td>
                    <td className="nowrap">{book.average_rating ? `${book.average_rating} / 5` : '—'}</td>
                    <td>
                      {book.available_copies > 0 ? (
                        <span className="chip chip-ok">Available</span>
                      ) : (
                        <span className="chip chip-warn">All issued</span>
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
        <h2>Add a book</h2>
        <form action={addBook} className="form-grid">
          <label className="field span-2">
            <span>Title</span>
            <input name="title" required maxLength={200} />
          </label>
          <label className="field span-2">
            <span>Authors (comma separated)</span>
            <input name="authors" required placeholder="e.g. Brian W. Kernighan, Dennis M. Ritchie" />
          </label>
          <label className="field">
            <span>ISBN (10 or 13 digits)</span>
            <input name="isbn" required pattern="[0-9]{10}|[0-9]{13}" inputMode="numeric" />
          </label>
          <label className="field">
            <span>Publisher</span>
            <input name="publisher" maxLength={100} />
          </label>
          <label className="field">
            <span>Year</span>
            <input name="publication_year" type="number" min="1450" max="2100" />
          </label>
          <label className="field">
            <span>Copies</span>
            <input name="total_copies" type="number" min="1" max="999" defaultValue="1" required />
          </label>
          <fieldset className="field span-4 checks">
            <legend>Categories</legend>
            {categories.map((c) => (
              <label key={c.category_id} className="check">
                <input type="checkbox" name="category_ids" value={c.category_id} />
                <span>{c.category_name}</span>
              </label>
            ))}
          </fieldset>
          <div className="form-actions">
            <button type="submit" className="btn">Add book</button>
            <span className="hint">An author who is not in the library yet is added automatically.</span>
          </div>
        </form>
      </section>
    </>
  );
}
