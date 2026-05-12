import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/db/middleware';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/builder' || request.nextUrl.pathname.startsWith('/builder/')) {
    return NextResponse.redirect(new URL('/app/designs', request.url));
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals, static assets, and the brick SVGs.
    '/((?!_next/static|_next/image|favicon.ico|bricks/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|css|js|map)$).*)',
  ],
};
