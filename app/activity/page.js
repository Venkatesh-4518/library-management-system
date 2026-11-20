import Link from 'next/link';
import { mongoRead } from '@/lib/mongodb';
import { formatDateTime } from '@/lib/format';
import DataTable from '@/components/DataTable';
import Notice from '@/components/Notice';
import ConfirmButton from '@/components/ConfirmButton';
import { clearSearchHistory } from './actions';

// One line of plain text for the "details" sub-document of a log entry.
// The keys differ from action to action, which is why the log is in MongoDB.
function describe(details = {}) {
  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join(' · ');
}

export default async function ActivityPage({ searchParams }) {
  const params = await searchParams;
  const action = params.action || '';

  const data = await mongoRead(async (db) => {
    const logs = db.collection('activity_logs');
    const searches = db.collection('search_history');

    // MongoDB: latest 50 entries, optionally of one action
    const entries = await logs
      .find(action ? { action } : {})
      .sort({ at: -1 })
      .limit(50)
      .toArray();

    // MongoDB aggregation: number of entries per action
    const perAction = await logs
      .aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ])
      .toArray();

    // MongoDB aggregation: most searched words ($unwind opens the terms array)
    const topTerms = await searches
      .aggregate([
        { $unwind: '$terms' },
        { $group: { _id: '$terms', searches: { $sum: 1 }, avg_results: { $avg: '$results' } } },
        { $sort: { searches: -1, _id: 1 } },
        { $limit: 8 },
      ])
      .toArray();

    // MongoDB: searches that found no book
    const noResults = await searches
      .find({ results: 0 }, { projection: { _id: 0, query: 1, at: 1 } })
      .sort({ at: -1 })
      .limit(8)
      .toArray();

    return { entries, perAction, topTerms, noResults };
  });

  if (data === null) {
    return (
      <>
        <div className="page-head">
          <h1>Activity Log</h1>
          <p className="sub">Stored in MongoDB.</p>
        </div>
        <section className="card">
          <p className="empty">
            MongoDB is not connected. Start it and check MONGODB_URI in .env.local, then reload this page.
            The rest of the website keeps working without it.
          </p>
        </section>
      </>
    );
  }

  const { entries, perAction, topTerms, noResults } = data;

  return (
    <>
      <div className="page-head">
        <h1>Activity Log</h1>
        <p className="sub">
          Every add, issue, return and review is appended to MongoDB as a document, and so is every book search.
        </p>
      </div>

      <Notice params={params} />

      <div className="grid-3">
        <section className="card">
          <h2>Entries per action</h2>
          <DataTable
            rows={perAction.map((row) => ({ action: row._id, entries: row.count }))}
            empty="No entries yet."
          />
        </section>
        <section className="card">
          <h2>Most searched words</h2>
          <DataTable
            rows={topTerms.map((row) => ({
              word: row._id,
              searches: row.searches,
              avg_books_found: row.avg_results.toFixed(1),
            }))}
            empty="No searches yet."
          />
        </section>
        <section className="card">
          <h2>Searches with no result</h2>
          <DataTable
            rows={noResults.map((row) => ({ searched_for: row.query, when: formatDateTime(row.at) }))}
            empty="Every search found a book."
          />
          <form action={clearSearchHistory} className="form-row card-foot">
            <ConfirmButton className="btn btn-ghost btn-small" message="Delete the whole search history?">
              Clear search history
            </ConfirmButton>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>
          {action ? action.replaceAll('_', ' ') : 'Latest entries'}
          <span className="count">{entries.length}</span>
        </h2>
        <div className="filters">
          <Link href="/activity" className={action ? 'chip chip-link' : 'chip chip-link chip-on'}>All</Link>
          {perAction.map((row) => (
            <Link
              key={row._id}
              href={`/activity?action=${row._id}`}
              className={action === row._id ? 'chip chip-link chip-on' : 'chip chip-link'}
            >
              {row._id.replaceAll('_', ' ')}
            </Link>
          ))}
        </div>
        {entries.length === 0 ? (
          <p className="empty">No entries.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={String(entry._id)}>
                    <td className="nowrap">{formatDateTime(entry.at)}</td>
                    <td><span className="chip">{entry.action.replaceAll('_', ' ')}</span></td>
                    <td>{describe(entry.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
