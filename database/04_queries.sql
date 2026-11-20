-- =====================================================================
-- Library Management System : 04_queries.sql
-- The queries the website runs, grouped by type.
-- The same statements are embedded in the Next.js pages under app/.
-- =====================================================================

USE library_db;

-- ---------------------------------------------------------------------
-- A. Simple queries
-- ---------------------------------------------------------------------

-- A1. Search books by title, author or ISBN (app/books/page.js)
SELECT book_id, title, authors, categories, isbn, total_copies, available_copies
FROM   vw_book_catalogue
WHERE  title LIKE '%data%' OR authors LIKE '%data%' OR isbn LIKE '%data%'
ORDER BY title;

-- A2. Books that can be issued right now
SELECT book_id, title, available_copies
FROM   books
WHERE  available_copies > 0
ORDER BY title;

-- ---------------------------------------------------------------------
-- B. Join queries
-- ---------------------------------------------------------------------

-- B1. Books currently issued, with member and due date (3-table join)
SELECT  br.borrowing_id, b.title, u.name, u.email, br.issue_date, br.due_date
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
JOIN    users u ON u.user_id = br.user_id
WHERE   br.status = 'ISSUED'
ORDER BY br.due_date;

-- B2. Overdue books with the fine that would be charged today (view + function)
SELECT  borrowing_id, title, member_name, due_date, days_overdue,
        fn_calculate_fine(due_date, CURDATE()) AS fine_if_returned_today
FROM    vw_active_borrowings
WHERE   days_overdue > 0
ORDER BY days_overdue DESC;

-- B3. Every member with the number of books held (LEFT JOIN keeps
--     members who hold nothing)
SELECT  u.name, u.role, COUNT(br.borrowing_id) AS books_held
FROM    users u
LEFT JOIN borrowings br
       ON br.user_id = u.user_id AND br.status = 'ISSUED'
WHERE   u.role <> 'librarian'
GROUP BY u.user_id, u.name, u.role
ORDER BY books_held DESC, u.name;

-- B4. Books of one category with their authors (join through both M:N tables)
SELECT  b.title, a.author_name
FROM    books b
JOIN    book_categories bc ON bc.book_id    = b.book_id
JOIN    categories c       ON c.category_id = bc.category_id
JOIN    book_authors ba    ON ba.book_id    = b.book_id
JOIN    authors a          ON a.author_id   = ba.author_id
WHERE   c.category_name = 'Databases'
ORDER BY b.title, a.author_id;

-- ---------------------------------------------------------------------
-- C. Aggregate queries
-- ---------------------------------------------------------------------

-- C1. Most borrowed books
SELECT  b.title, COUNT(*) AS times_borrowed
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
GROUP BY b.book_id, b.title
ORDER BY times_borrowed DESC, b.title
LIMIT 5;

-- C2. Titles, copies and availability per category
SELECT  c.category_name,
        COUNT(b.book_id)                     AS titles,
        COALESCE(SUM(b.total_copies), 0)     AS total_copies,
        COALESCE(SUM(b.available_copies), 0) AS available_copies
FROM    categories c
LEFT JOIN book_categories bc ON bc.category_id = c.category_id
LEFT JOIN books b            ON b.book_id      = bc.book_id
GROUP BY c.category_id, c.category_name
ORDER BY titles DESC, c.category_name;

-- C3. Books rated 4 or above on average (HAVING filters the groups)
SELECT  b.title,
        ROUND(AVG(r.rating), 1) AS average_rating,
        COUNT(*)                AS reviews
FROM    reviews r
JOIN    books b ON b.book_id = r.book_id
GROUP BY b.book_id, b.title
HAVING  AVG(r.rating) >= 4
ORDER BY average_rating DESC, reviews DESC;

-- C4. Late returns and fines per member (function inside an aggregate)
SELECT  u.name,
        COUNT(*) AS late_returns,
        SUM(fn_calculate_fine(br.due_date, br.return_date)) AS total_fine
FROM    borrowings br
JOIN    users u ON u.user_id = br.user_id
WHERE   br.status = 'RETURNED' AND br.return_date > br.due_date
GROUP BY u.user_id, u.name
ORDER BY total_fine DESC;

-- C5. Authors with more than one book in the library
SELECT  a.author_name, COUNT(*) AS books
FROM    authors a
JOIN    book_authors ba ON ba.author_id = a.author_id
GROUP BY a.author_id, a.author_name
HAVING  COUNT(*) > 1;

-- ---------------------------------------------------------------------
-- D. Nested queries
-- ---------------------------------------------------------------------

-- D1. Members who have never borrowed a book
SELECT name, email, role
FROM   users
WHERE  role <> 'librarian'
  AND  user_id NOT IN (SELECT user_id FROM borrowings);

-- D2. Books borrowed more often than the average book
SELECT  b.title, COUNT(*) AS times_borrowed
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
GROUP BY b.book_id, b.title
HAVING  COUNT(*) > (SELECT COUNT(*) / COUNT(DISTINCT book_id) FROM borrowings);

-- D3. Books that have never been borrowed (correlated subquery)
SELECT  b.title
FROM    books b
WHERE   NOT EXISTS (SELECT 1 FROM borrowings br WHERE br.book_id = b.book_id);

-- D4. Members who borrowed a book from the 'Databases' category
SELECT  name, email
FROM    users
WHERE   user_id IN (SELECT br.user_id
                    FROM   borrowings br
                    WHERE  br.book_id IN (SELECT bc.book_id
                                          FROM   book_categories bc
                                          JOIN   categories c ON c.category_id = bc.category_id
                                          WHERE  c.category_name = 'Databases'));

-- ---------------------------------------------------------------------
-- E. Data changes made by the website
-- The tables have plain INT keys (no AUTO_INCREMENT), so each insert
-- first takes the next id with MAX(id) + 1 inside a transaction.
-- ---------------------------------------------------------------------

-- E1. Add a book with its author and category links (app/books/actions.js)
START TRANSACTION;
SELECT COALESCE(MAX(book_id), 0) + 1 INTO @book_id FROM books FOR UPDATE;
INSERT INTO books (book_id, title, isbn, publisher, publication_year, total_copies, available_copies)
VALUES (@book_id, 'JavaScript: The Good Parts', '9780596517748', 'O''Reilly', 2008, 2, 2);
SELECT COALESCE(MAX(author_id), 0) + 1 INTO @author_id FROM authors FOR UPDATE;
INSERT INTO authors (author_id, author_name) VALUES (@author_id, 'Douglas Crockford');
INSERT INTO book_authors (book_id, author_id) VALUES (@book_id, @author_id);
INSERT INTO book_categories (book_id, category_id) VALUES (@book_id, 8);
COMMIT;

-- E2. Change the number of copies; available_copies moves by the same amount.
--     trg_books_before_update rejects a total below the copies currently issued.
UPDATE books
SET    available_copies = available_copies + (5 - total_copies),
       total_copies     = 5
WHERE  book_id = @book_id;

-- E3. Register a member (app/members/actions.js). The password is hashed by the site.
SELECT COALESCE(MAX(user_id), 0) + 1 INTO @user_id FROM users;
INSERT INTO users (user_id, name, email, phone, password, role, register_date)
VALUES (@user_id, 'Ishaan Verma', 'ishaan.verma@example.com', '9000000011',
        'scrypt$5f3a9c1e7b2d4f608a1c3e5d7f9b0a2c$977bfd0b20e0c6a70a1c71fc49a3b0f29626331efa4a9f8160bfe56524deb4fb',
        'student', CURDATE());

-- E4. Issue and return through the stored procedures (app/borrowings/actions.js)
CALL sp_issue_book(@book_id, @user_id);
SELECT MAX(borrowing_id) INTO @borrowing_id FROM borrowings;
CALL sp_return_book(@borrowing_id);

-- E5. Review a borrowed book (app/books/actions.js)
SELECT COALESCE(MAX(review_id), 0) + 1 INTO @review_id FROM reviews;
INSERT INTO reviews (review_id, user_id, book_id, rating, review_text, review_date)
VALUES (@review_id, @user_id, @book_id, 5, 'Short and to the point.', CURDATE());

-- E6. Borrowing history and recommendations of a member (app/members/[id]/page.js)
CALL sp_user_history(@user_id);
CALL sp_generate_recommendations(@user_id);

-- E7. Remove the demo rows again (child rows first, because of the foreign keys)
DELETE FROM recommendations WHERE user_id = @user_id;
DELETE FROM reviews         WHERE user_id = @user_id;
DELETE FROM borrowings      WHERE user_id = @user_id;
DELETE FROM users           WHERE user_id = @user_id;
DELETE FROM book_authors    WHERE book_id = @book_id;
DELETE FROM book_categories WHERE book_id = @book_id;
DELETE FROM books           WHERE book_id = @book_id;
DELETE FROM authors         WHERE author_id = @author_id;
