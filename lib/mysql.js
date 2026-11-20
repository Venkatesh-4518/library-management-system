import mysql from 'mysql2/promise';

// One connection pool for the whole site. It is kept on globalThis so
// that hot reloading in `next dev` does not open a new pool each time.
const pool =
  globalThis._mysqlPool ??
  mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'library_db',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true, // DATE columns come back as 'YYYY-MM-DD' strings
  });

if (process.env.NODE_ENV !== 'production') globalThis._mysqlPool = pool;

// Run one SQL statement. Values are passed separately as `?` parameters,
// never concatenated into the SQL text, so user input cannot inject SQL.
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// CALL a stored procedure and return the rows of its first SELECT.
export async function callProcedure(sql, params = []) {
  const [results] = await pool.query(sql, params);
  return Array.isArray(results[0]) ? results[0] : [];
}

// Run several statements as one transaction on a single connection.
// `work` receives run(sql, params); everything is rolled back on an error.
export async function transaction(work) {
  const connection = await pool.getConnection();
  const run = async (sql, params = []) => {
    const [rows] = await connection.query(sql, params);
    return rows;
  };
  try {
    await connection.beginTransaction();
    const result = await work(run);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

// Turn a MySQL error into a sentence that can be shown on the page.
export function sqlErrorMessage(err, messages = {}) {
  // SQLSTATE 45000 is raised by SIGNAL in our triggers and procedures
  if (err.sqlState === '45000') return err.sqlMessage;
  if (err.code === 'ER_DUP_ENTRY') {
    return messages.duplicate || 'That record already exists.';
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return messages.referenced || 'This record is used by other records and cannot be deleted.';
  }
  if (err.code === 'ECONNREFUSED') {
    return 'Cannot connect to MySQL. Check that the server is running and .env.local is correct.';
  }
  return err.sqlMessage || err.message;
}
