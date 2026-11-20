-- =====================================================================
-- Library Management System : 01_schema.sql
-- DDL: database, the nine tables, indexes, views
-- Run:  mysql -u root -p < database/01_schema.sql
-- =====================================================================

DROP DATABASE IF EXISTS library_db;
CREATE DATABASE library_db;
USE library_db;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Library members and staff. role is 'student', 'faculty' or 'librarian'.
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15),
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    register_date DATE
);

-- One row per title; copies are tracked as counts.
CREATE TABLE books (
    book_id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(100),
    publication_year INT,
    total_copies INT NOT NULL,
    available_copies INT NOT NULL
);

CREATE TABLE authors (
    author_id INT PRIMARY KEY,
    author_name VARCHAR(100) NOT NULL,
    biography TEXT
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    description TEXT
);

-- One row per book issued to a member. status is 'ISSUED' or 'RETURNED'.
CREATE TABLE borrowings (
    borrowing_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);

CREATE TABLE reviews (
    review_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    rating INT,
    review_text TEXT,
    review_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);

-- Books suggested to a member by sp_generate_recommendations.
CREATE TABLE recommendations (
    recommendation_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    book_id INT NOT NULL,
    reason TEXT,
    recommended_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);

-- A book can have many authors and an author many books (M:N).
CREATE TABLE book_authors (
    book_id INT,
    author_id INT,
    PRIMARY KEY (book_id, author_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    FOREIGN KEY (author_id) REFERENCES authors(author_id)
);

-- A book can sit in many categories and a category holds many books (M:N).
CREATE TABLE book_categories (
    book_id INT,
    category_id INT,
    PRIMARY KEY (book_id, category_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- ---------------------------------------------------------------------
-- Indexes used by the search box and the issue screens
-- ---------------------------------------------------------------------
CREATE INDEX idx_books_title       ON books (title);
CREATE INDEX idx_authors_name      ON authors (author_name);
CREATE INDEX idx_borrowings_status ON borrowings (status, due_date);

-- ---------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------

-- Catalogue: every book with its authors and categories joined into
-- one string each, and the number of copies currently issued.
CREATE VIEW vw_book_catalogue AS
SELECT  b.book_id,
        b.title,
        b.isbn,
        b.publisher,
        b.publication_year,
        b.total_copies,
        b.available_copies,
        b.total_copies - b.available_copies AS issued_copies,
        (SELECT GROUP_CONCAT(a.author_name ORDER BY a.author_id SEPARATOR ', ')
         FROM   book_authors ba
         JOIN   authors a ON a.author_id = ba.author_id
         WHERE  ba.book_id = b.book_id) AS authors,
        (SELECT GROUP_CONCAT(c.category_name ORDER BY c.category_name SEPARATOR ', ')
         FROM   book_categories bc
         JOIN   categories c ON c.category_id = bc.category_id
         WHERE  bc.book_id = b.book_id) AS categories
FROM    books b;

-- Every book that is currently out, with who has it and how late it is.
CREATE VIEW vw_active_borrowings AS
SELECT  br.borrowing_id,
        b.book_id,
        b.title,
        u.user_id,
        u.name AS member_name,
        u.email,
        br.issue_date,
        br.due_date,
        GREATEST(DATEDIFF(CURDATE(), br.due_date), 0) AS days_overdue
FROM    borrowings br
JOIN    books b ON b.book_id = br.book_id
JOIN    users u ON u.user_id = br.user_id
WHERE   br.status = 'ISSUED';
