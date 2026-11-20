import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const dbName = process.env.MONGODB_DB || 'library_nosql';

// One MongoClient for the whole site, reused across requests.
export async function getDb() {
  if (!globalThis._mongoClientPromise) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 2000 });
    globalThis._mongoClientPromise = client.connect().catch((err) => {
      globalThis._mongoClientPromise = null; // try again on the next request
      throw err;
    });
  }
  const client = await globalThis._mongoClientPromise;
  return client.db(dbName);
}

// Run a MongoDB read for a page. If MongoDB is not running the page
// still loads: the caller gets `fallback` and shows a short note.
export async function mongoRead(fn, fallback = null) {
  try {
    return await fn(await getDb());
  } catch (err) {
    console.error('MongoDB read failed:', err.message);
    return fallback;
  }
}

// Append one entry to the activity log. A logging failure must never
// undo or block the SQL work that was just done, so errors are swallowed.
export async function logActivity(action, details) {
  try {
    const db = await getDb();
    await db.collection('activity_logs').insertOne({ action, details, at: new Date() });
  } catch (err) {
    console.error('MongoDB log failed:', err.message);
  }
}

// Record one search made on the Books page.
export async function logSearch({ query, category, availableOnly, results }) {
  try {
    const db = await getDb();
    await db.collection('search_history').insertOne({
      query,
      terms: query.toLowerCase().split(/\s+/).filter(Boolean),
      category: category || null,
      available_only: Boolean(availableOnly),
      results,
      at: new Date(),
    });
  } catch (err) {
    console.error('MongoDB search log failed:', err.message);
  }
}
