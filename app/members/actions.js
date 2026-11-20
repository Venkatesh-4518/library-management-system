'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, callProcedure, transaction, sqlErrorMessage } from '@/lib/mysql';
import { logActivity } from '@/lib/mongodb';
import { hashPassword } from '@/lib/password';
import { withNotice } from '@/lib/format';

const ROLES = ['student', 'faculty', 'librarian'];

// ---------------------------------------------------------------------
// Register a member (SQL INSERT)
// ---------------------------------------------------------------------
export async function addMember(formData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const phone = String(formData.get('phone') || '').trim() || null;
  const role = String(formData.get('role') || '');
  const password = String(formData.get('password') || '');

  let target;
  if (!name || !email || !ROLES.includes(role) || password.length < 8) {
    target = withNotice('/members', 'error',
      'Fill in name, email, role and a password of at least 8 characters.');
  } else {
    try {
      const userId = await transaction(async (run) => {
        const [next] = await run('SELECT COALESCE(MAX(user_id), 0) + 1 AS id FROM users FOR UPDATE');
        await run(
          `INSERT INTO users (user_id, name, email, phone, password, role, register_date)
           VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
          [next.id, name, email, phone, hashPassword(password), role]
        );
        return next.id;
      });
      await logActivity('REGISTER_MEMBER', { user_id: userId, name, role });
      target = withNotice('/members', 'ok', `Registered ${name} as ${role}.`);
    } catch (err) {
      target = withNotice('/members', 'error', sqlErrorMessage(err, {
        duplicate: 'A member with this email is already registered.',
      }));
    }
  }

  revalidatePath('/members');
  redirect(target);
}

// ---------------------------------------------------------------------
// Remove a member (SQL transaction)
// The member's reviews and recommendations go first, then the member.
// The foreign key from borrowings stops the delete when the member has
// any borrowing record, and the transaction is rolled back.
// ---------------------------------------------------------------------
export async function deleteMember(formData) {
  const userId = Number(formData.get('user_id'));

  let target;
  try {
    const [member] = await query('SELECT name FROM users WHERE user_id = ?', [userId]);
    await transaction(async (run) => {
      await run('DELETE FROM recommendations WHERE user_id = ?', [userId]);
      await run('DELETE FROM reviews         WHERE user_id = ?', [userId]);
      await run('DELETE FROM users           WHERE user_id = ?', [userId]);
    });
    await logActivity('DELETE_MEMBER', { user_id: userId, name: member?.name });
    target = withNotice('/members', 'ok', `Removed ${member?.name}.`);
  } catch (err) {
    target = withNotice(`/members/${userId}`, 'error', sqlErrorMessage(err, {
      referenced: 'This member has borrowing records, so the registration cannot be removed.',
    }));
  }

  revalidatePath('/members');
  redirect(target);
}

// ---------------------------------------------------------------------
// Rebuild a member's recommendations: CALL sp_generate_recommendations
// ---------------------------------------------------------------------
export async function generateRecommendations(formData) {
  const userId = Number(formData.get('user_id'));
  const path = `/members/${userId}`;

  let target;
  try {
    const rows = await callProcedure('CALL sp_generate_recommendations(?)', [userId]);
    const [member] = await query('SELECT name FROM users WHERE user_id = ?', [userId]);
    await logActivity('RECOMMEND_BOOKS', { user_id: userId, name: member?.name, books: rows.length });
    target = withNotice(path, 'ok', `Generated ${rows.length} recommendation${rows.length === 1 ? '' : 's'}.`);
  } catch (err) {
    target = withNotice(path, 'error', sqlErrorMessage(err));
  }

  revalidatePath(path);
  redirect(target);
}
