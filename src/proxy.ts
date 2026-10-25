import { NextResponse, type NextRequest } from 'next/server';
import { getSessionCookie } from 'better-auth/cookies';

const PUBLIC_PATHS = [/^\/login/, /^\/invite\//];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => p.test(pathname))) return NextResponse.next();
  if (getSessionCookie(request, { cookiePrefix: 'novachat' })) return NextResponse.next();

  const url = new URL('/login', request.url);
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!api|webhooks|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico)$).*)'],
};
