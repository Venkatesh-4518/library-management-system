'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, transaction, sqlErrorMessage } from '@/lib/mysql';
import { logActivity } from '@/lib/mongodb';
import { withNotice } from '@/lib/format';

// ---------------------------------------------------------------------
// Add an author (SQL INSERT)
// ---------------------------------------------------------------------
export async function addAuthor(formData) {
  const name = String(formData.get('author_name') || '').trim();
  const biography = String(formData.get('biography') || '').trim() || null;

  let target;
  if (!name) {
    target = withNotice('/catalog', 'error', 'Enter the author\'s name.');
  } else {
    try {
      const [existing] = await query('SELECT author_id FROM authors WHERE author_name = ?', [name]);
      if (existing) {
        target = withNotice('/catalog', 'error', `${name} is already in the list of authors.`);
      } else {
        const authorId = await transaction(async (run) => {
          const [next] = await run('SELECT COALESCE(MAX(author_id), 0) + 1 AS id FROM authors FOR UPDATE');
          await run(
            'INSERT INTO authors (author_id, author_name, biography) VALUES (?, ?, ?)',
            [next.id, name, biography]
          );
          return next.id;
        });
        await logActivity('ADD_AUTHOR', { author_id: authorId, name });
        target = withNotice('/catalog', 'ok', `Added the author ${name}.`);
      }
    } catch (err) {
      target = withNotice('/catalog', 'error', sqlErrorMessage(err));
    }
  }

  revalidatePath('/catalog');
  redirect(target);
}

// ---------------------------------------------------------------------
// Delete an author (SQL DELETE). The foreign key from book_authors
// blocks this while any book is still linked to the author.
// ---------------------------------------------------------------------
export async function deleteAuthor(formData) {
  const authorId = Number(formData.get('author_id'));

  let target;
  try {
    await query('DELETE FROM authors WHERE author_id = ?', [authorId]);
    target = withNotice('/catalog', 'ok', 'Author deleted.');
  } catch (err) {
    target = withNotice('/catalog', 'error', sqlErrorMessage(err, {
      referenced: 'This author still has books in the library and cannot be deleted.',
    }));
  }

  revalidatePath('/catalog');
  redirect(target);
}

// ---------------------------------------------------------------------
// Add a category (SQL INSERT)
// ---------------------------------------------------------------------
export async function addCategory(formData) {
  const name = String(formData.get('category_name') || '').trim();
  const description = String(formData.get('description') || '').trim() || null;

  let target;
  if (!name) {
    target = withNotice('/catalog', 'error', 'Enter the category name.');
  } else {
    try {
      const [existing] = await query('SELECT category_id FROM categories WHERE category_name = ?', [name]);
      if (existing) {
        target = withNotice('/catalog', 'error', `The category "${name}" already exists.`);
      } else {
        const categoryId = await transaction(async (run) => {
          const [next] = await run('SELECT COALESCE(MAX(category_id), 0) + 1 AS id FROM categories FOR UPDATE');
          await run(
            'INSERT INTO categories (category_id, category_name, description) VALUES (?, ?, ?)',
            [next.id, name, description]
          );
          return next.id;
        });
        await logActivity('ADD_CATEGORY', { category_id: categoryId, name });
        target = withNotice('/catalog', 'ok', `Added the category "${name}".`);
      }
    } catch (err) {
      target = withNotice('/catalog', 'error', sqlErrorMessage(err));
    }
  }

  revalidatePath('/catalog');
  redirect(target);
}

// ---------------------------------------------------------------------
// Delete a category (SQL DELETE). The foreign key from book_categories
// blocks this while any book is still in the category.
// ---------------------------------------------------------------------
export async function deleteCategory(formData) {
  const categoryId = Number(formData.get('category_id'));

  let target;
  try {
    await query('DELETE FROM categories WHERE category_id = ?', [categoryId]);
    target = withNotice('/catalog', 'ok', 'Category deleted.');
  } catch (err) {
    target = withNotice('/catalog', 'error', sqlErrorMessage(err, {
      referenced: 'This category still has books and cannot be deleted.',
    }));
  }

  revalidatePath('/catalog');
  redirect(target);
}
