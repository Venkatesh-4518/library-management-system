-- =====================================================================
-- Library Management System : 02_routines.sql
-- Stored functions, triggers and stored procedures
-- Run:  mysql -u root -p < database/02_routines.sql
-- =====================================================================

USE library_db;

DROP TRIGGER   IF EXISTS trg_books_before_insert;
DROP TRIGGER   IF EXISTS trg_books_before_update;
DROP TRIGGER   IF EXISTS trg_borrowing_before_insert;
DROP TRIGGER   IF EXISTS trg_borrowing_after_insert;
DROP TRIGGER   IF EXISTS trg_borrowing_before_update;
DROP TRIGGER   IF EXISTS trg_borrowing_after_update;
DROP TRIGGER   IF EXISTS trg_review_before_insert;
DROP PROCEDURE IF EXISTS sp_issue_book;
DROP PROCEDURE IF EXISTS sp_return_book;
DROP PROCEDURE IF EXISTS sp_user_history;
DROP PROCEDURE IF EXISTS sp_generate_recommendations;
DROP FUNCTION  IF EXISTS fn_calculate_fine;
DROP FUNCTION  IF EXISTS fn_average_rating;

DELIMITER $$

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Rs. 2 for every day a book is kept after its due date.
CREATE FUNCTION fn_calculate_fine(p_due_date DATE, p_return_date DATE)
RETURNS DECIMAL(8,2)
DETERMINISTIC
BEGIN
    DECLARE v_days_late INT;
    SET v_days_late = DATEDIFF(p_return_date, p_due_date);
    IF v_days_late IS NULL OR v_days_late <= 0 THEN
        RETURN 0.00;
    END IF;
    RETURN v_days_late * 2.00;
END$$

-- Average review rating of a book, NULL when it has no reviews.
CREATE FUNCTION fn_average_rating(p_book_id INT)
RETURNS DECIMAL(3,1)
READS SQL DATA
BEGIN
    DECLARE v_average DECIMAL(3,1);
    SELECT ROUND(AVG(rating), 1) INTO v_average
    FROM   reviews
    WHERE  book_id = p_book_id;
    RETURN v_average;
END$$

-- =====================================================================
-- TRIGGERS ON books
-- Copy counts must stay sensible: 0 <= available_copies <= total_copies.
-- =====================================================================

CREATE TRIGGER trg_books_before_insert
BEFORE INSERT ON books
FOR EACH ROW
BEGIN
    IF NEW.total_copies < 0
       OR NEW.available_copies < 0
       OR NEW.available_copies > NEW.total_copies THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Available copies must be between 0 and total copies';
    END IF;
END$$

CREATE TRIGGER trg_books_before_update
BEFORE UPDATE ON books
FOR EACH ROW
BEGIN
    IF NEW.total_copies < 0
       OR NEW.available_copies < 0
       OR NEW.available_copies > NEW.total_copies THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Available copies must be between 0 and total copies';
    END IF;
END$$

-- =====================================================================
-- TRIGGERS ON borrowings
-- =====================================================================

-- Rules checked before a book is issued:
--   1. the book must have at least one available copy
--   2. a member can hold at most 3 books at a time
--   3. a member cannot hold two copies of the same book
-- Also fills in the issue date, a 14-day due date and the status.
CREATE TRIGGER trg_borrowing_before_insert
BEFORE INSERT ON borrowings
FOR EACH ROW
BEGIN
    DECLARE v_available INT;
    DECLARE v_active    INT;
    DECLARE v_same_book INT;

    SELECT available_copies INTO v_available
    FROM   books
    WHERE  book_id = NEW.book_id;

    IF v_available IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Book does not exist';
    END IF;

    IF v_available <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No copies of this book are available';
    END IF;

    SELECT COUNT(*) INTO v_active
    FROM   borrowings
    WHERE  user_id = NEW.user_id AND status = 'ISSUED';

    IF v_active >= 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Member already holds the maximum of 3 books';
    END IF;

    SELECT COUNT(*) INTO v_same_book
    FROM   borrowings
    WHERE  user_id = NEW.user_id
      AND  book_id = NEW.book_id
      AND  status  = 'ISSUED';

    IF v_same_book > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Member already holds a copy of this book';
    END IF;

    IF NEW.issue_date IS NULL THEN
        SET NEW.issue_date = CURDATE();
    END IF;

    IF NEW.due_date IS NULL THEN
        SET NEW.due_date = DATE_ADD(NEW.issue_date, INTERVAL 14 DAY);
    END IF;

    IF NEW.status IS NULL OR NEW.status = '' THEN
        SET NEW.status = 'ISSUED';
    END IF;
END$$

-- One copy leaves the shelf when a book is issued.
CREATE TRIGGER trg_borrowing_after_insert
AFTER INSERT ON borrowings
FOR EACH ROW
BEGIN
    UPDATE books
    SET    available_copies = available_copies - 1
    WHERE  book_id = NEW.book_id;
END$$

-- When a borrowing is marked RETURNED, stamp the return date.
-- A returned borrowing cannot be re-opened.
CREATE TRIGGER trg_borrowing_before_update
BEFORE UPDATE ON borrowings
FOR EACH ROW
BEGIN
    IF OLD.status = 'RETURNED' AND NEW.status = 'ISSUED' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'A returned book cannot be re-opened; issue it again';
    END IF;

    IF OLD.status = 'ISSUED' AND NEW.status = 'RETURNED'
       AND NEW.return_date IS NULL THEN
        SET NEW.return_date = CURDATE();
    END IF;
END$$

-- One copy goes back on the shelf when a book is returned.
CREATE TRIGGER trg_borrowing_after_update
AFTER UPDATE ON borrowings
FOR EACH ROW
BEGIN
    IF OLD.status = 'ISSUED' AND NEW.status = 'RETURNED' THEN
        UPDATE books
        SET    available_copies = available_copies + 1
        WHERE  book_id = NEW.book_id;
    END IF;
END$$

-- =====================================================================
-- TRIGGER ON reviews
--   1. rating must be 1 to 5
--   2. only a member who has borrowed the book can review it
--   3. one review per member per book
-- =====================================================================
CREATE TRIGGER trg_review_before_insert
BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
    DECLARE v_borrowed INT;
    DECLARE v_existing INT;

    IF NEW.rating IS NULL OR NEW.rating < 1 OR NEW.rating > 5 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Rating must be between 1 and 5';
    END IF;

    SELECT COUNT(*) INTO v_borrowed
    FROM   borrowings
    WHERE  user_id = NEW.user_id AND book_id = NEW.book_id;

    IF v_borrowed = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only a member who has borrowed this book can review it';
    END IF;

    SELECT COUNT(*) INTO v_existing
    FROM   reviews
    WHERE  user_id = NEW.user_id AND book_id = NEW.book_id;

    IF v_existing > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This member has already reviewed this book';
    END IF;

    IF NEW.review_date IS NULL THEN
        SET NEW.review_date = CURDATE();
    END IF;
END$$

-- =====================================================================
-- STORED PROCEDURES
-- =====================================================================

-- Issue one copy of a book to a member inside a transaction.
-- The triggers above enforce the rules and update availability.
CREATE PROCEDURE sp_issue_book(IN p_book_id INT, IN p_user_id INT)
BEGIN
    DECLARE v_borrowing_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COALESCE(MAX(borrowing_id), 0) + 1 INTO v_borrowing_id
    FROM   borrowings
    FOR UPDATE;

    INSERT INTO borrowings (borrowing_id, user_id, book_id, issue_date, due_date, status)
    VALUES (v_borrowing_id, p_user_id, p_book_id, CURDATE(),
            DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'ISSUED');

    COMMIT;

    SELECT borrowing_id, issue_date, due_date
    FROM   borrowings
    WHERE  borrowing_id = v_borrowing_id;
END$$

-- Mark a borrowing as returned and report the fine for a late return.
CREATE PROCEDURE sp_return_book(IN p_borrowing_id INT)
BEGIN
    DECLARE v_status VARCHAR(20);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_status
    FROM   borrowings
    WHERE  borrowing_id = p_borrowing_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Borrowing record not found';
    END IF;

    IF v_status = 'RETURNED' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'This book has already been returned';
    END IF;

    UPDATE borrowings
    SET    status = 'RETURNED', return_date = CURDATE()
    WHERE  borrowing_id = p_borrowing_id;

    COMMIT;

    SELECT borrowing_id, return_date,
           fn_calculate_fine(due_date, return_date) AS fine_amount
    FROM   borrowings
    WHERE  borrowing_id = p_borrowing_id;
END$$

-- Full borrowing history of one member, newest first.
CREATE PROCEDURE sp_user_history(IN p_user_id INT)
BEGIN
    SELECT  br.borrowing_id,
            b.book_id,
            b.title,
            br.issue_date,
            br.due_date,
            br.return_date,
            br.status,
            fn_calculate_fine(br.due_date, COALESCE(br.return_date, CURDATE())) AS fine_amount
    FROM    borrowings br
    JOIN    books b ON b.book_id = br.book_id
    WHERE   br.user_id = p_user_id
    ORDER BY br.issue_date DESC, br.borrowing_id DESC;
END$$

-- Rebuild the recommendations of one member (5 books).
-- Step 1: books that share a category with a book the member has
--         borrowed, that the member has not borrowed, with a copy
--         available. More shared categories first, then better rated.
-- Step 2: if fewer than 5 were found, the list is topped up with the
--         most borrowed titles the member has not borrowed yet.
CREATE PROCEDURE sp_generate_recommendations(IN p_user_id INT)
BEGIN
    DECLARE v_last_id INT;
    DECLARE v_found   INT;
    DECLARE v_missing INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    DELETE FROM recommendations WHERE user_id = p_user_id;

    -- Step 1: category matches
    SELECT COALESCE(MAX(recommendation_id), 0) INTO v_last_id
    FROM   recommendations;

    INSERT INTO recommendations
        (recommendation_id, user_id, book_id, reason, recommended_date)
    SELECT  v_last_id + ROW_NUMBER() OVER (ORDER BY t.matches DESC, t.avg_rating DESC, t.title),
            p_user_id,
            t.book_id,
            CONCAT('Because you borrowed books in ', t.shared_categories),
            CURDATE()
    FROM (
        SELECT  b.book_id,
                b.title,
                COUNT(*) AS matches,
                GROUP_CONCAT(c.category_name ORDER BY c.category_name SEPARATOR ', ') AS shared_categories,
                COALESCE(fn_average_rating(b.book_id), 0) AS avg_rating
        FROM    books b
        JOIN    book_categories bc ON bc.book_id = b.book_id
        JOIN    categories c       ON c.category_id = bc.category_id
        WHERE   bc.category_id IN (SELECT bc2.category_id
                                   FROM   borrowings br
                                   JOIN   book_categories bc2 ON bc2.book_id = br.book_id
                                   WHERE  br.user_id = p_user_id)
          AND   b.book_id NOT IN (SELECT book_id FROM borrowings WHERE user_id = p_user_id)
          AND   b.available_copies > 0
        GROUP BY b.book_id, b.title
        ORDER BY matches DESC, avg_rating DESC, b.title
        LIMIT 5
    ) AS t;

    -- Step 2: top up with popular titles
    SELECT COUNT(*) INTO v_found
    FROM   recommendations
    WHERE  user_id = p_user_id;

    SET v_missing = 5 - v_found;

    IF v_missing > 0 THEN
        SELECT COALESCE(MAX(recommendation_id), 0) INTO v_last_id
        FROM   recommendations;

        INSERT INTO recommendations
            (recommendation_id, user_id, book_id, reason, recommended_date)
        SELECT  v_last_id + ROW_NUMBER() OVER (ORDER BY t.times_borrowed DESC, t.title),
                p_user_id,
                t.book_id,
                'Popular with other members',
                CURDATE()
        FROM (
            SELECT  b.book_id, b.title, COUNT(br.borrowing_id) AS times_borrowed
            FROM    books b
            LEFT JOIN borrowings br ON br.book_id = b.book_id
            WHERE   b.available_copies > 0
              AND   b.book_id NOT IN (SELECT book_id FROM borrowings  WHERE user_id = p_user_id)
              AND   b.book_id NOT IN (SELECT book_id FROM recommendations WHERE user_id = p_user_id)
            GROUP BY b.book_id, b.title
            ORDER BY times_borrowed DESC, b.title
            LIMIT v_missing
        ) AS t;
    END IF;

    COMMIT;

    SELECT  r.recommendation_id, r.book_id, b.title, r.reason, r.recommended_date
    FROM    recommendations r
    JOIN    books b ON b.book_id = r.book_id
    WHERE   r.user_id = p_user_id
    ORDER BY r.recommendation_id;
END$$

DELIMITER ;
