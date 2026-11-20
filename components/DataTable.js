// Renders any array of rows as a table, using the row keys as headings.
// Used by the SQL Reports and Activity Log pages.
export default function DataTable({ rows, empty = 'No rows.' }) {
  if (!rows || rows.length === 0) {
    return <p className="empty">{empty}</p>;
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column.replaceAll('_', ' ')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column}>{row[column] === null ? '—' : String(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
