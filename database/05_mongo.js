// =====================================================================
// Library Management System : 05_mongo.js
// NoSQL (MongoDB) commands: collections, indexes, sample documents,
// queries, updates and aggregations.
// Run:  mongosh database/05_mongo.js
//
// MySQL holds all library records. MongoDB holds two kinds of data that
// have no fixed columns: the activity log and the search history.
// =====================================================================

db = db.getSiblingDB('library_nosql');

// ---------------------------------------------------------------------
// 1. Collections
// ---------------------------------------------------------------------
db.activity_logs.drop();
db.search_history.drop();

// activity_logs : an append-only audit trail. Each action stores a
// different "details" sub-document.
db.createCollection('activity_logs');

// search_history : one document per search made on the Books page.
// "terms" is the query split into words; "results" is how many books matched.
db.createCollection('search_history', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['query', 'terms', 'results', 'at'],
      properties: {
        query:          { bsonType: 'string' },
        terms:          { bsonType: 'array', items: { bsonType: 'string' } },
        category:       { bsonType: ['string', 'null'] },
        available_only: { bsonType: 'bool' },
        results:        { bsonType: ['int', 'long', 'double'], minimum: 0 },
        at:             { bsonType: 'date' }
      }
    }
  }
});

// ---------------------------------------------------------------------
// 2. Indexes
// ---------------------------------------------------------------------
db.activity_logs.createIndex({ at: -1 });
db.activity_logs.createIndex({ action: 1 });
db.search_history.createIndex({ at: -1 });
db.search_history.createIndex({ terms: 1 });

// ---------------------------------------------------------------------
// 3. Insert sample documents
// ---------------------------------------------------------------------
db.activity_logs.insertMany([
  { action: 'ISSUE_BOOK',  at: new Date(),
    details: { borrowing_id: 12, book_id: 11, title: 'An Introduction to Statistical Learning',
               user_id: 8, member: 'Sneha Pillai' } },
  { action: 'RETURN_BOOK', at: new Date(),
    details: { borrowing_id: 6, book_id: 1, title: 'Database System Concepts',
               user_id: 7, member: 'Arjun Reddy', fine_amount: 18 } },
  { action: 'ADD_BOOK',    at: new Date(),
    details: { book_id: 14, title: 'Wings of Fire', isbn: '9788173711466', copies: 2,
               authors: ['A. P. J. Abdul Kalam', 'Arun Tiwari'] } },
  { action: 'REGISTER_MEMBER', at: new Date(),
    details: { user_id: 8, name: 'Sneha Pillai', role: 'student' } }
]);

db.search_history.insertMany([
  { query: 'database systems', terms: ['database', 'systems'], category: null,
    available_only: false, results: 2, at: new Date() },
  { query: 'machine learning', terms: ['machine', 'learning'], category: 'AI and Machine Learning',
    available_only: true, results: 1, at: new Date() },
  { query: 'database', terms: ['database'], category: null,
    available_only: false, results: 2, at: new Date() },
  { query: 'compiler design', terms: ['compiler', 'design'], category: null,
    available_only: false, results: 0, at: new Date() },
  { query: 'kalam', terms: ['kalam'], category: null,
    available_only: false, results: 1, at: new Date() }
]);

// ---------------------------------------------------------------------
// 4. Read queries
// ---------------------------------------------------------------------

// Latest 50 log entries (app/activity/page.js)
printjson(db.activity_logs.find().sort({ at: -1 }).limit(50).toArray());

// Log entries of one kind
printjson(db.activity_logs.find({ action: 'RETURN_BOOK' }).toArray());

// Returns where a fine was charged: a condition on a nested field
printjson(db.activity_logs.find(
  { action: 'RETURN_BOOK', 'details.fine_amount': { $gt: 0 } },
  { _id: 0, 'details.title': 1, 'details.member': 1, 'details.fine_amount': 1 }
).toArray());

// Searches that found nothing: books members want but the library lacks
printjson(db.search_history.find({ results: 0 }, { _id: 0, query: 1, at: 1 }).sort({ at: -1 }).toArray());

// Searches that used the word "database" (matches inside the terms array)
printjson(db.search_history.find({ terms: 'database' }).toArray());

// ---------------------------------------------------------------------
// 5. Update and delete
// ---------------------------------------------------------------------

// Mark a zero-result search as followed up by the librarian
db.search_history.updateOne(
  { query: 'compiler design' },
  { $set: { followed_up: true, note: 'Added to the purchase list' } }
);

// Add a word to the terms array of a search without rewriting the array
db.search_history.updateOne(
  { query: 'kalam' },
  { $addToSet: { terms: 'biography' } }
);

// Delete one search
db.search_history.deleteOne({ query: 'machine learning' });

// Clear the whole search history (the button on app/activity/page.js)
// db.search_history.deleteMany({});

// ---------------------------------------------------------------------
// 6. Aggregations
// ---------------------------------------------------------------------

// Number of log entries per action (app/activity/page.js)
printjson(db.activity_logs.aggregate([
  { $group: { _id: '$action', count: { $sum: 1 } } },
  { $sort: { count: -1, _id: 1 } }
]).toArray());

// Most searched words: $unwind opens the terms array (app/activity/page.js)
printjson(db.search_history.aggregate([
  { $unwind: '$terms' },
  { $group: { _id: '$terms', searches: { $sum: 1 }, avg_results: { $avg: '$results' } } },
  { $sort: { searches: -1, _id: 1 } },
  { $limit: 10 }
]).toArray());

// Total fines recorded in the log, per member
printjson(db.activity_logs.aggregate([
  { $match: { action: 'RETURN_BOOK', 'details.fine_amount': { $gt: 0 } } },
  { $group: { _id: '$details.member', total_fine: { $sum: '$details.fine_amount' }, returns: { $sum: 1 } } },
  { $sort: { total_fine: -1 } }
]).toArray());
