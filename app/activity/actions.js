'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/mongodb';
import { withNotice } from '@/lib/format';

// ---------------------------------------------------------------------
// Clear the search history (MongoDB deleteMany)
// ---------------------------------------------------------------------
export async function clearSearchHistory() {
  let target;
  try {
    const db = await getDb();
    const result = await db.collection('search_history').deleteMany({});
    target = withNotice('/activity', 'ok', `Deleted ${result.deletedCount} saved searches.`);
  } catch (err) {
    target = withNotice('/activity', 'error', `Could not clear the search history: ${err.message}`);
  }

  revalidatePath('/activity');
  redirect(target);
}
