import './globals.css';
import Nav from '@/components/Nav';

export const metadata = {
  title: 'Library Management System',
  description: 'DBMS mini project: books, students, issue and return, built with Next.js, MySQL and MongoDB',
};

// Every page reads live data from the databases, so nothing is pre-rendered.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
