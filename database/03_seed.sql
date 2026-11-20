-- =====================================================================
-- Library Management System : 03_seed.sql
-- DML: sample data. The people below are fictional sample records.
-- Run after 01_schema.sql and 02_routines.sql:
--       mysql -u root -p < database/03_seed.sql
-- =====================================================================

USE library_db;

-- ---------------------------------------------------------------------
-- users
-- Passwords are never stored as plain text. Every sample user has the
-- password "library123", stored as a salted scrypt hash (the same format
-- the app writes when a member is registered).
-- ---------------------------------------------------------------------
SET @sample_password =
    '123';

INSERT INTO users (user_id, name, email, phone, password, role, register_date) VALUES
    (1,  'Aarav Sharma',     'aarav.sharma@example.com',   '9000000001', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 120 DAY)),
    (2,  'Diya Nair',        'diya.nair@example.com',      '9000000002', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 118 DAY)),
    (3,  'Kabir Mehta',      'kabir.mehta@example.com',    '9000000003', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 110 DAY)),
    (4,  'Ananya Rao',       'ananya.rao@example.com',     '9000000004', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 104 DAY)),
    (5,  'Rohan Iyer',       'rohan.iyer@example.com',     '9000000005', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 97 DAY)),
    (6,  'Meera Kulkarni',   'meera.kulkarni@example.com', '9000000006', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 90 DAY)),
    (7,  'Arjun Reddy',      'arjun.reddy@example.com',    '9000000007', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 82 DAY)),
    (8,  'Sneha Pillai',     'sneha.pillai@example.com',   '9000000008', @sample_password, 'student',   DATE_SUB(CURDATE(), INTERVAL 75 DAY)),
    (9,  'Dr. Nikhil Joshi', 'nikhil.joshi@example.com',   '9000000009', @sample_password, 'faculty',   DATE_SUB(CURDATE(), INTERVAL 150 DAY)),
    (10, 'Lakshmi Menon',    'lakshmi.menon@example.com',  '9000000010', @sample_password, 'librarian', DATE_SUB(CURDATE(), INTERVAL 200 DAY));

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
INSERT INTO categories (category_id, category_name, description) VALUES
    (1, 'Databases',               'Database design, SQL, transactions and storage'),
    (2, 'Algorithms',              'Algorithm design and analysis, data structures'),
    (3, 'Operating Systems',       'Processes, memory, file systems and concurrency'),
    (4, 'Computer Networks',       'Protocols, the Internet and network programming'),
    (5, 'Software Engineering',    'Design, code quality and engineering practice'),
    (6, 'AI and Machine Learning', 'Artificial intelligence, statistical and deep learning'),
    (7, 'Mathematics',             'Discrete mathematics, statistics and proofs'),
    (8, 'Programming',             'Programming languages and coding technique'),
    (9, 'Biography',               'Lives of scientists and leaders');

-- ---------------------------------------------------------------------
-- authors
-- ---------------------------------------------------------------------
INSERT INTO authors (author_id, author_name, biography) VALUES
    (1,  'Abraham Silberschatz', 'Professor of computer science at Yale University.'),
    (2,  'Henry F. Korth',       NULL),
    (3,  'S. Sudarshan',         NULL),
    (4,  'Ramez Elmasri',        NULL),
    (5,  'Shamkant B. Navathe',  NULL),
    (6,  'Thomas H. Cormen',     'Professor emeritus of computer science at Dartmouth College.'),
    (7,  'Charles E. Leiserson', NULL),
    (8,  'Ronald L. Rivest',     NULL),
    (9,  'Clifford Stein',       NULL),
    (10, 'Peter Baer Galvin',    NULL),
    (11, 'Greg Gagne',           NULL),
    (12, 'James F. Kurose',      NULL),
    (13, 'Keith W. Ross',        NULL),
    (14, 'Robert C. Martin',     'Software engineer and co-author of the Agile Manifesto.'),
    (15, 'David Thomas',         NULL),
    (16, 'Andrew Hunt',          NULL),
    (17, 'Erich Gamma',          NULL),
    (18, 'Richard Helm',         NULL),
    (19, 'Ralph Johnson',        NULL),
    (20, 'John Vlissides',       NULL),
    (21, 'Stuart Russell',       NULL),
    (22, 'Peter Norvig',         NULL),
    (23, 'Ian Goodfellow',       NULL),
    (24, 'Yoshua Bengio',        'Deep learning researcher and 2018 Turing Award winner.'),
    (25, 'Aaron Courville',      NULL),
    (26, 'Gareth James',         NULL),
    (27, 'Daniela Witten',       NULL),
    (28, 'Trevor Hastie',        NULL),
    (29, 'Robert Tibshirani',    NULL),
    (30, 'Kenneth H. Rosen',     NULL),
    (31, 'Brian W. Kernighan',   'Computer scientist at Princeton University and co-author of the first book on C.'),
    (32, 'Dennis M. Ritchie',    'Creator of the C programming language and co-creator of Unix.'),
    (33, 'A. P. J. Abdul Kalam', 'Aerospace scientist and the 11th President of India.'),
    (34, 'Arun Tiwari',          NULL);

-- ---------------------------------------------------------------------
-- books
-- ---------------------------------------------------------------------
INSERT INTO books
    (book_id, title, isbn, publisher, publication_year, total_copies, available_copies)
VALUES
    (1,  'Database System Concepts',                   '9780078022159', 'McGraw-Hill',        2019, 4, 4),
    (2,  'Fundamentals of Database Systems',           '9780133970777', 'Pearson',            2015, 3, 3),
    (3,  'Introduction to Algorithms',                 '9780262033848', 'MIT Press',          2009, 3, 3),
    (4,  'Operating System Concepts',                  '9781118063330', 'Wiley',              2012, 3, 3),
    (5,  'Computer Networking: A Top-Down Approach',   '9780133594140', 'Pearson',            2016, 2, 2),
    (6,  'Clean Code',                                 '9780132350884', 'Prentice Hall',      2008, 2, 2),
    (7,  'The Pragmatic Programmer',                   '9780135957059', 'Addison-Wesley',     2019, 1, 1),
    (8,  'Design Patterns',                            '9780201633610', 'Addison-Wesley',     1994, 2, 2),
    (9,  'Artificial Intelligence: A Modern Approach', '9780136042594', 'Pearson',            2009, 2, 2),
    (10, 'Deep Learning',                              '9780262035613', 'MIT Press',          2016, 1, 1),
    (11, 'An Introduction to Statistical Learning',    '9781461471370', 'Springer',           2013, 2, 2),
    (12, 'Discrete Mathematics and Its Applications',  '9780073383095', 'McGraw-Hill',        2011, 3, 3),
    (13, 'The C Programming Language',                 '9780131103627', 'Prentice Hall',      1988, 2, 2),
    (14, 'Wings of Fire',                              '9788173711466', 'Universities Press', 1999, 2, 2);

-- ---------------------------------------------------------------------
-- book_authors (M:N). Abraham Silberschatz wrote books 1 and 4.
-- ---------------------------------------------------------------------
INSERT INTO book_authors (book_id, author_id) VALUES
    (1, 1), (1, 2), (1, 3),
    (2, 4), (2, 5),
    (3, 6), (3, 7), (3, 8), (3, 9),
    (4, 1), (4, 10), (4, 11),
    (5, 12), (5, 13),
    (6, 14),
    (7, 15), (7, 16),
    (8, 17), (8, 18), (8, 19), (8, 20),
    (9, 21), (9, 22),
    (10, 23), (10, 24), (10, 25),
    (11, 26), (11, 27), (11, 28), (11, 29),
    (12, 30),
    (13, 31), (13, 32),
    (14, 33), (14, 34);

-- ---------------------------------------------------------------------
-- book_categories (M:N). Several books sit in two categories.
-- ---------------------------------------------------------------------
INSERT INTO book_categories (book_id, category_id) VALUES
    (1, 1),
    (2, 1),
    (3, 2), (3, 7),
    (4, 3),
    (5, 4),
    (6, 5), (6, 8),
    (7, 5), (7, 8),
    (8, 5), (8, 8),
    (9, 6),
    (10, 6), (10, 7),
    (11, 6), (11, 7),
    (12, 7),
    (13, 8),
    (14, 9);

-- ---------------------------------------------------------------------
-- borrowings. Dates are relative to today so the demo always shows
-- current, overdue and returned books. The triggers fire here: every
-- INSERT lowers available_copies and every return raises it again.
-- ---------------------------------------------------------------------

-- Returned on time
INSERT INTO borrowings (borrowing_id, user_id, book_id, issue_date, due_date, status) VALUES
    (1, 1, 1, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_SUB(CURDATE(), INTERVAL 46 DAY), 'ISSUED'),
    (2, 2, 3, DATE_SUB(CURDATE(), INTERVAL 55 DAY), DATE_SUB(CURDATE(), INTERVAL 41 DAY), 'ISSUED'),
    (3, 4, 6, DATE_SUB(CURDATE(), INTERVAL 50 DAY), DATE_SUB(CURDATE(), INTERVAL 36 DAY), 'ISSUED'),
    (4, 3, 1, DATE_SUB(CURDATE(), INTERVAL 45 DAY), DATE_SUB(CURDATE(), INTERVAL 31 DAY), 'ISSUED');

UPDATE borrowings SET status = 'RETURNED', return_date = DATE_SUB(CURDATE(), INTERVAL 50 DAY) WHERE borrowing_id = 1;
UPDATE borrowings SET status = 'RETURNED', return_date = DATE_SUB(CURDATE(), INTERVAL 44 DAY) WHERE borrowing_id = 2;
UPDATE borrowings SET status = 'RETURNED', return_date = DATE_SUB(CURDATE(), INTERVAL 40 DAY) WHERE borrowing_id = 3;
UPDATE borrowings SET status = 'RETURNED', return_date = DATE_SUB(CURDATE(), INTERVAL 33 DAY) WHERE borrowing_id = 4;

-- Returned late (6 and 9 days after the due date)
INSERT INTO borrowings (borrowing_id, user_id, book_id, issue_date, due_date, status) VALUES
    (5, 5, 9, DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_SUB(CURDATE(), INTERVAL 26 DAY), 'ISSUED'),
    (6, 7, 1, DATE_SUB(CURDATE(), INTERVAL 38 DAY), DATE_SUB(CURDATE(), INTERVAL 24 DAY), 'ISSUED');

UPDATE borrowings SET status = 'RETURNED', return_date = DATE_SUB(CURDATE(), INTERVAL 20 DAY) WHERE borrowing_id = 5;
UPDATE borrowings SET status = 'RETURNED', return_date = DATE_SUB(CURDATE(), INTERVAL 15 DAY) WHERE borrowing_id = 6;

-- Currently issued and overdue
INSERT INTO borrowings (borrowing_id, user_id, book_id, issue_date, due_date, status) VALUES
    (7, 8, 10, DATE_SUB(CURDATE(), INTERVAL 22 DAY), DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'ISSUED'),
    (8, 3, 4,  DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'ISSUED');

-- Currently issued, not yet due
INSERT INTO borrowings (borrowing_id, user_id, book_id, issue_date, due_date, status) VALUES
    (9,  2, 1,  DATE_SUB(CURDATE(), INTERVAL 6 DAY), DATE_ADD(CURDATE(), INTERVAL 8 DAY),  'ISSUED'),
    (10, 1, 3,  DATE_SUB(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'ISSUED'),
    (11, 7, 7,  DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 11 DAY), 'ISSUED'),
    (12, 8, 11, DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 12 DAY), 'ISSUED');

-- ---------------------------------------------------------------------
-- reviews. trg_review_before_insert lets a member review only a book
-- that member has borrowed.
-- ---------------------------------------------------------------------
INSERT INTO reviews (review_id, user_id, book_id, rating, review_text, review_date) VALUES
    (1, 1, 1, 5, 'Covers normalization and transactions clearly. Used it for the whole DBMS course.', DATE_SUB(CURDATE(), INTERVAL 48 DAY)),
    (2, 3, 1, 4, 'Good theory, the SQL chapters need more worked examples.',                          DATE_SUB(CURDATE(), INTERVAL 30 DAY)),
    (3, 7, 1, 4, 'The indexing and hashing chapter is the best part.',                                DATE_SUB(CURDATE(), INTERVAL 14 DAY)),
    (4, 2, 3, 5, 'Dense but complete. The graph algorithms section is excellent.',                    DATE_SUB(CURDATE(), INTERVAL 43 DAY)),
    (5, 4, 6, 4, 'Changed how I name functions and variables.',                                       DATE_SUB(CURDATE(), INTERVAL 39 DAY)),
    (6, 5, 9, 3, 'Very broad. Hard to finish inside one loan period.',                                DATE_SUB(CURDATE(), INTERVAL 19 DAY));

-- ---------------------------------------------------------------------
-- recommendations are produced by the stored procedure
-- ---------------------------------------------------------------------
CALL sp_generate_recommendations(1);
CALL sp_generate_recommendations(8);
