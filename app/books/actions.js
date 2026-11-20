'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, transaction, sqlErrorMessage } from '@/lib/mysql';
import { logActivity } from '@/lib/mongodb';
import { withNotice } from '@/lib/format';

// ---------------------------------------------------------------------
// Add a book (SQL transaction)
// Inserts the book, links it to its authors (creating any author that
// is new) and to its categories. The tables use plain INT keys, so the
// next id is MAX(id) + 1, read inside the same transaction.
// ---------------------------------------------------------------------
export async function addBook(formData) {
  const title = String(formData.get('title') || '').trim();
  const isbn = String(formData.get('isbn') || '').trim();
  const publisher = String(formData.get('publisher') || '').trim() || null;
  const year = formData.get('publication_year') ? Number(formData.get('publication_year')) : null;
  const copies = Number(formData.get('total_copies'));
  const authorNames = [
    ...new Set(
      String(formData.get('authors') || '')
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    ),
  ];
  const categoryIds = formData.getAll('category_ids').map(Number).filter(Boolean);

  let target;
  if (!title || !/^(\d{10}|\d{13})$/.test(isbn) || !(copies >= 1) || authorNames.length === 0 || categoryIds.length === 0) {
    target = withNotice('/books', 'error',
      'Fill in title, at least one author, a 10 or 13 digit ISBN, at least 1 copy and at least one category.');
  } else {
    try {
      const bookId = await transaction(async (run) => {
        const [next] = await run('SELECT COALESCE(MAX(book_id), 0) + 1 AS id FROM books FOR UPDATE');

        await run(
          `INSERT INTO books
             (book_id, title, isbn, publisher, publication_year, total_copies, available_copies)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [next.id, title, isbn, publisher, year, copies, copies]
        );

        for (const name of authorNames) {
          const [existing] = await run('SELECT author_id FROM authors WHERE author_name = ?', [name]);
          let authorId = existing?.author_id;
          if (!authorId) {
            const [nextAuthor] = await run('SELECT COALESCE(MAX(author_id), 0) + 1 AS id FROM authors FOR UPDATE');
            await run('INSERT INTO authors (author_id, author_name) VALUES (?, ?)', [nextAuthor.id, name]);
            authorId = nextAuthor.id;
          }
          await run('INSERT INTO book_authors (book_id, author_id) VALUES (?, ?)', [next.id, authorId]);
        }

        for (const categoryId of categoryIds) {
          await run('INSERT INTO book_categories (book_id, category_id) VALUES (?, ?)', [next.id, categoryId]);
        }

        return next.id;
      });

      await logActivity('ADD_BOOK', { book_id: bookId, title, isbn, copies, authors: authorNames });
      target = withNotice('/books', 'ok', `Added "${title}" with ${copies} ${copies === 1 ? 'copy' : 'copies'}.`);
    } catch (err) {
      target = withNotice('/books', 'error', sqlErrorMessage(err, {
        duplicate: `A book with ISBN ${isbn} is already in the catalogue.`,
      }));
    }
  }

  revalidatePath('/books');
  redirect(target);
}

// ---------------------------------------------------------------------
// Change the number of copies (SQL UPDATE)
// available_copies moves by the same amount as total_copies. If the new
// total is lower than the copies currently issued, available_copies
// would go negative and trg_books_before_update rejects the update.
// ---------------------------------------------------------------------
export async function updateCopies(formData) {
  const bookId = Number(formData.get('book_id'));
  const copies = Number(formData.get('total_copies'));
  const path = `/books/${bookId}`;

  let target;
  if (!Number.isInteger(copies) || copies < 0) {
    target = withNotice(path, 'error', 'Copies must be a whole number, 0 or more.');
  } else {
    try {
      await query(
        `UPDATE books
         SET    available_copies = available_copies + (? - total_copies),
                total_copies     = ?
         WHERE  book_id = ?`,
        [copies, copies, bookId]
      );
      const [book] = await query('SELECT title FROM books WHERE book_id = ?', [bookId]);
      await logActivity('UPDATE_COPIES', { book_id: bookId, title: book?.title, total_copies: copies });
      target = withNotice(path, 'ok', `Total copies set to ${copies}.`);
    } catch (err) {
      target = withNotice(path, 'error',
        err.sqlState === '45000'
          ? 'Total copies cannot be lower than the number of copies currently issued.'
          : sqlErrorMessage(err));
    }
  }

  revalidatePath('/books');
  redirect(target);
}

// ---------------------------------------------------------------------
// Delete a book (SQL transaction)
// The book's author links, category links, reviews and recommendations
// go first, then the book. If the book has any borrowing record, the
// foreign key from borrowings stops the last DELETE and the whole
// transaction is rolled back, so nothing is lost.
// ---------------------------------------------------------------------
export async function deleteBook(formData) {
  const bookId = Number(formData.get('book_id'));

  let target;
  try {
    const [book] = await query('SELECT title FROM books WHERE book_id = ?', [bookId]);
    await transaction(async (run) => {
      await run('DELETE FROM book_authors    WHERE book_id = ?', [bookId]);
      await run('DELETE FROM book_categories WHERE book_id = ?', [bookId]);
      await run('DELETE FROM recommendations WHERE book_id = ?', [bookId]);
      await run('DELETE FROM reviews         WHERE book_id = ?', [bookId]);
      await run('DELETE FROM books           WHERE book_id = ?', [bookId]);
    });
    await logActivity('DELETE_BOOK', { book_id: bookId, title: book?.title });
    target = withNotice('/books', 'ok', `Deleted "${book?.title}".`);
  } catch (err) {
    target = withNotice(`/books/${bookId}`, 'error', sqlErrorMessage(err, {
      referenced: 'This book has borrowing records, so it cannot be deleted. Set its copies to 0 instead.',
    }));
  }

  revalidatePath('/books');
  redirect(target);
}

// ---------------------------------------------------------------------
// Post a review (SQL INSERT)
// trg_review_before_insert checks the rating, that the member has
// borrowed the book, and that the member has not reviewed it already.
// ---------------------------------------------------------------------
export async function addReview(formData) {
  const bookId = Number(formData.get('book_id'));
  const userId = Number(formData.get('user_id'));
  const rating = Number(formData.get('rating'));
  const text = String(formData.get('review_text') || '').trim() || null;
  const path = `/books/${bookId}`;

  let target;
  if (!userId) {
    target = withNotice(path, 'error', 'Choose the member who is reviewing the book.');
  } else {
    try {
      await transaction(async (run) => {
        const [next] = await run('SELECT COALESCE(MAX(review_id), 0) + 1 AS id FROM reviews FOR UPDATE');
        await run(
          `INSERT INTO reviews (review_id, user_id, book_id, rating, review_text, review_date)
           VALUES (?, ?, ?, ?, ?, CURDATE())`,
          [next.id, userId, bookId, rating, text]
        );
      });
      const [info] = await query(
        `SELECT b.title, u.name
         FROM   books b, users u
         WHERE  b.book_id = ? AND u.user_id = ?`,
        [bookId, userId]
      );
      await logActivity('REVIEW_BOOK', { book_id: bookId, title: info.title, user_id: userId, member: info.name, rating });
      target = withNotice(path, 'ok', `Saved ${info.name}'s review.`);
    } catch (err) {
      target = withNotice(path, 'error', sqlErrorMessage(err));
    }
  }

  revalidatePath(path);
  redirect(target);
}

// ---------------------------------------------------------------------
// Delete a review (SQL DELETE)
// ---------------------------------------------------------------------
export async function deleteReview(formData) {
  const bookId = Number(formData.get('book_id'));
  const reviewId = Number(formData.get('review_id'));
  const path = `/books/${bookId}`;

  let target;
  try {
    await query('DELETE FROM reviews WHERE review_id = ?', [reviewId]);
    target = withNotice(path, 'ok', 'Review deleted.');
  } catch (err) {
    target = withNotice(path, 'error', sqlErrorMessage(err));
  }

  revalidatePath(path);
  redirect(target);
}
