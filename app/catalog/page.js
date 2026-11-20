import { query } from '@/lib/mysql';
import Notice from '@/components/Notice';
import ConfirmButton from '@/components/ConfirmButton';
import { addAuthor, deleteAuthor, addCategory, deleteCategory } from './actions';

export default async function CatalogPage({ searchParams }) {
  const params = await searchParams;

  // SQL: every author with the number of books (LEFT JOIN keeps authors with none)
  const authors = await query(`
    SELECT a.author_id, a.author_name, a.biography, COUNT(ba.book_id) AS books
    FROM   authors a
    LEFT JOIN book_authors ba ON ba.author_id = a.author_id
    GROUP BY a.author_id, a.author_name, a.biography
    ORDER BY a.author_name
  `);

  // SQL: every category with its titles and copies (two LEFT JOINs through the M:N table)
  const categories = await query(`
    SELECT c.category_id, c.category_name, c.description,
           COUNT(b.book_id)                     AS titles,
           COALESCE(SUM(b.available_copies), 0) AS available_copies
    FROM   categories c
    LEFT JOIN book_categories bc ON bc.category_id = c.category_id
    LEFT JOIN books b            ON b.book_id      = bc.book_id
    GROUP BY c.category_id, c.category_name, c.description
    ORDER BY c.category_name
  `);

  return (
    <>
      <div className="page-head">
        <h1>Authors &amp; Categories</h1>
        <p className="sub">
          A book can have several authors and sit in several categories. Books are linked to them on the Books page.
        </p>
      </div>

      <Notice params={params} />

      <section className="card">
        <h2>Categories <span className="count">{categories.length}</span></h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th className="num">Titles</th>
                <th className="num">Copies available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.category_id}>
                  <td><a href={`/books?category=${c.category_id}`}>{c.category_name}</a></td>
                  <td>{c.description || '—'}</td>
                  <td className="num">{c.titles}</td>
                  <td className="num">{c.available_copies}</td>
                  <td className="actions">
                    {c.titles === 0 ? (
                      <form action={deleteCategory}>
                        <input type="hidden" name="category_id" value={c.category_id} />
                        <ConfirmButton className="link-btn" message={`Delete the category "${c.category_name}"?`}>
                          Delete
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Add a category</h3>
        <form action={addCategory} className="form-row">
          <label className="field">
            <span>Name</span>
            <input name="category_name" required maxLength={100} />
          </label>
          <label className="field grow">
            <span>Description</span>
            <input name="description" maxLength={300} />
          </label>
          <button type="submit" className="btn">Add category</button>
        </form>
      </section>

      <section className="card">
        <h2>Authors <span className="count">{authors.length}</span></h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Author</th>
                <th>Biography</th>
                <th className="num">Books</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {authors.map((a) => (
                <tr key={a.author_id}>
                  <td><a href={`/books?q=${encodeURIComponent(a.author_name)}`}>{a.author_name}</a></td>
                  <td>{a.biography || '—'}</td>
                  <td className="num">{a.books}</td>
                  <td className="actions">
                    {a.books === 0 ? (
                      <form action={deleteAuthor}>
                        <input type="hidden" name="author_id" value={a.author_id} />
                        <ConfirmButton className="link-btn" message={`Delete the author "${a.author_name}"?`}>
                          Delete
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Add an author</h3>
        <form action={addAuthor} className="form-row">
          <label className="field">
            <span>Name</span>
            <input name="author_name" required maxLength={100} />
          </label>
          <label className="field grow">
            <span>Biography</span>
            <input name="biography" maxLength={300} />
          </label>
          <button type="submit" className="btn">Add author</button>
        </form>
      </section>
    </>
  );
}
