// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const { pathname } = request.nextUrl

  // Check if the pathname contains .php
  if (pathname.includes('.php')) {
    // Return 404 for any PHP requests
    return new NextResponse(null, {
      status: 404,
      statusText: 'Not Found'
    })
  }

  // Continue with the request if no PHP is detected
  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: '/:path*'
}
