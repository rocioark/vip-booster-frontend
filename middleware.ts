import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // vb_access expira a los 15 min; si aún hay vb_refresh (7 días), se deja pasar
  // para que el cliente renueve la sesión vía /auth/refresh en vez de expulsar.
  const token = request.cookies.get('vb_access') ?? request.cookies.get('vb_refresh')
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
