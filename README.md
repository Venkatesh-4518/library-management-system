# Library Management System

DBMS mini project: a library management website for student accounts, books, members,
borrowings, returns, reviews and recommendations. Built with Next.js, MySQL and MongoDB.

- **MySQL** holds all library records in nine tables: `users`, `books`, `authors`,
  `categories`, `borrowings`, `reviews`, `recommendations`, `book_authors` and
  `book_categories`, plus views, functions, triggers and stored procedures.
- **MongoDB** holds the activity log and the search history.
- **Next.js** (App Router) is the website. SQL is written directly in page and
  server-action files under `app/`; the project does not use an ORM.

## What you need

- Node.js 20.9 or newer
- MySQL 8.0 or newer
- MongoDB 6 or newer, with `mongosh` (the website still runs without MongoDB; only the
  Activity Log page and search history are unavailable)

## Setup

1. Install the packages.

   ```bash
   npm install
   ```

2. Create the MySQL database. Run the three files in this order.

   ```bash
   mysql -u root -p < database/01_schema.sql
   mysql -u root -p < database/02_routines.sql
   mysql -u root -p < database/03_seed.sql
   ```

   In MySQL Workbench, open each file and run it with the lightning button instead.

3. Create the MongoDB collections and sample documents.

   ```bash
   mongosh database/05_mongo.js
   ```

4. Copy `.env.example` to `.env.local`. Set your MySQL password and choose a long,
   random `SESSION_SECRET` (at least 32 characters).

5. Start the website and open http://localhost:3000.

   ```bash
   npm run dev
   ```

To start again from clean data, repeat steps 2 and 3. Both scripts drop and recreate
everything they own.

## Pages

| Page | What it does | Database work |
| --- | --- | --- |
| `/login` | Sign in to a library account | Parameterized MySQL query; signed session cookie |
| `/register` | Register a student account | MySQL transaction; scrypt password hash |
| `/` Dashboard | Counts, overdue books, most borrowed and best rated books, recent activity | Scalar subqueries, view, function, GROUP BY; MongoDB `find` |
| `/books` | Search, list, add a book with authors and categories | `LIKE` search on a view, nested query, transaction of `INSERT`s; MongoDB `insertOne` |
| `/books/[id]` | Details, authors, copies, delete, history, reviews | Joins, `UPDATE`, `DELETE`, `INSERT` checked by a trigger |
| `/catalog` | Authors and categories | `LEFT JOIN` + `GROUP BY` through the M:N tables, `INSERT`, `DELETE` |
| `/members` | Search, list, register | `LEFT JOIN` + `GROUP BY`, `INSERT` |
| `/members/[id]` | Details, recommendations, borrowing history, reviews | `CALL sp_user_history`, `CALL sp_generate_recommendations`, aggregates |
| `/borrowings` | Issue and return books | `CALL sp_issue_book`, `CALL sp_return_book`, triggers |
| `/reports` | Twelve queries shown with their SQL | Join, aggregate, nested and correlated queries |
| `/activity` | Activity log and search statistics | MongoDB `find`, `$group`, `$unwind`, `deleteMany` |

## Rules the database enforces

- A book can be issued only while `available_copies` is above 0 (trigger).
- A member can hold at most 3 books, and not two copies of the same book (trigger).
- A loan runs 14 days. A late return is fined Rs. 2 per day (function).
- `available_copies` goes down on issue and up on return (triggers).
- `available_copies` can never be negative or above `total_copies` (triggers on `books`).
- A rating must be 1 to 5, a member can review only a book they borrowed, and only once (trigger).
- A book or member with borrowing records cannot be deleted (foreign keys).

## Notes

- The nine tables are created exactly as in the team's schema file. Their keys are plain
  `INT` (no `AUTO_INCREMENT`), so every insert takes the next id with `MAX(id) + 1`
  inside a transaction.
- `users.password` stores a salted scrypt hash. Login sessions are signed and stored in
  an HTTP-only cookie; set `SESSION_SECRET` in `.env.local`.
- The people in the sample data are fictional. Every sample user has the password
  `library123`.

## Project tree

```
library-management-system/
├── app/
│   ├── auth/
│   │   └── actions.js          Register, log in and log out
│   ├── login/
│   │   └── page.js             Student login
│   ├── register/
│   │   └── page.js             Student registration
│   ├── activity/
│   │   ├── actions.js         Clear the search history (MongoDB)
│   │   └── page.js            Activity log and search statistics (MongoDB)
│   ├── books/
│   │   ├── [id]/
│   │   │   └── page.js        One book: details, authors, history, reviews
│   │   ├── actions.js         Add / update / delete book, add / delete review
│   │   └── page.js            Search and list books, add-book form
│   ├── borrowings/
│   │   ├── actions.js         Issue and return through stored procedures
│   │   └── page.js            Issue form, books currently out, recent returns
│   ├── catalog/
│   │   ├── actions.js         Add / delete author and category
│   │   └── page.js            Authors and categories with book counts
│   ├── members/
│   │   ├── [id]/
│   │   │   └── page.js        One member: recommendations, history, reviews
│   │   ├── actions.js         Register / remove member, generate recommendations
│   │   └── page.js            Search and list members, registration form
│   ├── reports/
│   │   └── page.js            Join, aggregate and nested queries with results
│   ├── error.js               Shown when the database cannot be reached
│   ├── globals.css            All styles
│   ├── layout.js              Page frame with the navigation bar
│   ├── not-found.js           404 page
│   └── page.js                Dashboard
├── components/
│   ├── ConfirmButton.js       Submit button that asks before deleting
│   ├── DataTable.js           Generic table for query results
│   ├── Nav.js                 Top navigation bar
│   └── Notice.js              Success / error message after a form submit
├── database/
│   ├── 01_schema.sql          The nine tables, indexes, views
│   ├── 02_routines.sql        Functions, triggers, stored procedures
│   ├── 03_seed.sql            Sample data
│   ├── 04_queries.sql         The queries used by the website, grouped by type
│   └── 05_mongo.js            MongoDB collections, documents, queries
├── lib/
│   ├── auth.js                Signed session cookies
│   ├── format.js              Date and currency formatting
│   ├── mongodb.js             MongoDB connection, activity and search loggers
│   ├── mysql.js               MySQL connection pool, query and transaction helpers
│   └── password.js            Password hashing
├── proxy.js                   Protect pages that require a login
├── .env.example               Database connection settings (copy to .env.local)
├── jsconfig.json
├── next.config.mjs
├── package.json
└── README.md
```
