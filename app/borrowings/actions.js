'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, callProcedure, sqlErrorMessage } from '@/lib/mysql';
import { logActivity } from '@/lib/mongodb';
import { formatDate, rupees, withNotice } from '@/lib/format';

// SQL: names for the log entry and the confirmation message
async function borrowingSummary(borrowingId) {
  const [row] = await query(
    `SELECT b.book_id, b.title, u.user_id, u.name
     FROM   borrowings br
     JOIN   books b ON b.book_id = br.book_id
     JOIN   users u ON u.user_id = br.user_id
     WHERE  br.borrowing_id = ?`,
    [borrowingId]
  );
  return row;
}

// ---------------------------------------------------------------------
// Issue a book: CALL sp_issue_book
// The BEFORE INSERT trigger checks the rules (copy available, at most 3
// books, no duplicate copy) and the AFTER INSERT trigger lowers
// available_copies. A broken rule comes back as SQLSTATE 45000 and its
// message is shown to the librarian.
// ---------------------------------------------------------------------
export async function issueBook(formData) {
  const bookId = Number(formData.get('book_id'));
  const userId = Number(formData.get('user_id'));

  let target;
  if (!bookId || !userId) {
    target = withNotice('/borrowings', 'error', 'Choose a member and a book.');
  } else {
    try {
      const [borrowing] = await callProcedure('CALL sp_issue_book(?, ?)', [bookId, userId]);
      const info = await borrowingSummary(borrowing.borrowing_id);
      await logActivity('ISSUE_BOOK', {
        borrowing_id: borrowing.borrowing_id,
        book_id: info.book_id,
        title: info.title,
        user_id: info.user_id,
        member: info.name,
        due_date: borrowing.due_date,
      });
      target = withNotice('/borrowings', 'ok',
        `Issued "${info.title}" to ${info.name}. Due on ${formatDate(borrowing.due_date)}.`);
    } catch (err) {
      target = withNotice('/borrowings', 'error', sqlErrorMessage(err));
    }
  }

  revalidatePath('/borrowings');
  redirect(target);
}

// ---------------------------------------------------------------------
// Return a book: CALL sp_return_book
// The BEFORE UPDATE trigger stamps the return date, the AFTER UPDATE
// trigger raises available_copies, and the procedure reports the fine
// worked out by fn_calculate_fine.
// ---------------------------------------------------------------------
export async function returnBook(formData) {
  const borrowingId = Number(formData.get('borrowing_id'));

  let target;
  try {
    const [result] = await callProcedure('CALL sp_return_book(?)', [borrowingId]);
    const info = await borrowingSummary(borrowingId);
    const fine = Number(result.fine_amount);
    await logActivity('RETURN_BOOK', {
      borrowing_id: borrowingId,
      book_id: info.book_id,
      title: info.title,
      user_id: info.user_id,
      member: info.name,
      fine_amount: fine,
    });
    target = withNotice('/borrowings', 'ok',
      fine > 0
        ? `"${info.title}" returned by ${info.name}. Fine for the late return: ${rupees(fine)}.`
        : `"${info.title}" returned by ${info.name}. No fine.`);
  } catch (err) {
    target = withNotice('/borrowings', 'error', sqlErrorMessage(err));
  }

  revalidatePath('/borrowings');
  redirect(target);
}
