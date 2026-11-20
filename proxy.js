
import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'library_session';

export async function proxy(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const pathname = request.nextUrl.pathname;

  const isPublicPage =
    pathname === '/login' || pathname === '/register';

  if (isPublicPage && token) {
    try {
      await jwtVerify(
        token,
        new TextEncoder().encode(process.env.SESSION_SECRET)
      );
      return NextResponse.redirect(new URL('/', request.url));
    } catch {
      // Invalid or expired token: allow access to login/register.
    }
  }

  if (isPublicPage) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SESSION_SECRET)
    );

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL('/login', request.url)
    );
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
