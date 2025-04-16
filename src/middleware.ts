import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware ensures that routing works properly
export function middleware(request: NextRequest) {
  const currentUrl = request.nextUrl.clone();
  
  // Log the current URL for debugging
  console.log('Middleware processing URL:', currentUrl.pathname);
  
  // Continue to the requested page
  return NextResponse.next();
}

// Match all request paths except for the ones we want to exclude
export const config = {
  matcher: [
    // Match all paths except for:
    // - API routes
    // - Static files
    // - Assets
    // - Images
    // - Favicon
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 