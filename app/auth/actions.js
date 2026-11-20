
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query, transaction } from '@/lib/mysql';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/auth';

// --------------------------------------------------
// STUDENT REGISTRATION - Embedded SQL INSERT
// --------------------------------------------------
export async function registerStudent(formData) {
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const phone = String(formData.get('phone') || '').trim() || null;
  const password = String(formData.get('password') || '');

  if (!name || !email || password.length < 8) {
    redirect('/register?error=Please%20fill%20all%20required%20fields');
  }

  try {
    await transaction(async (run) => {
      // Embedded SQL: generate the next user ID.
      const [next] = await run(
        'SELECT COALESCE(MAX(user_id), 0) + 1 AS id FROM users FOR UPDATE'
      );

      // Embedded SQL: register the student in MySQL.
      await run(
        `INSERT INTO users
         (user_id, name, email, phone, password, role, register_date)
         VALUES (?, ?, ?, ?, ?, 'student', CURDATE())`,
        [next.id, name, email, phone, hashPassword(password)]
      );
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      redirect('/register?error=This%20email%20is%20already%20registered');
    }

    console.error('Registration error:', error);
    redirect('/register?error=Registration%20failed');
  }

  revalidatePath('/members');
  redirect('/login?registered=1');
}

// --------------------------------------------------
// LOGIN - Embedded SQL SELECT
// --------------------------------------------------
export async function loginUser(formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    redirect('/login?error=Enter%20your%20email%20and%20password');
  }

  // Embedded SQL: retrieve the user using parameterized SQL.
  const users = await query(
    `SELECT user_id, name, email, password, role
     FROM users
     WHERE email = ?`,
    [email]
  );

  const user = users[0];

  if (!user || !verifyPassword(password, user.password)) {
    redirect('/login?error=Invalid%20email%20or%20password');
  }

  await createSession(user);
  redirect('/');
}

// --------------------------------------------------
// LOGOUT - Delete the login session
// --------------------------------------------------
export async function logoutUser() {
  await deleteSession();
  redirect('/login');
}
