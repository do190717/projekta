import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // בדוק אם המשתמש מחובר
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes - דפים שדורשים התחברות
  const protectedPaths = ['/projects', '/profile']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // אם זה protected path והמשתמש לא מחובר - הפנה ל-login
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // אם המשתמש מחובר ומנסה לגשת ל-login - הפנה לדשבורד
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/projects', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * התאם את כל הנתיבים חוץ מ:
     * - _next/static (קבצים סטטיים)
     * - _next/image (קבצי תמונה)
     * - favicon.ico
     * - קבצים פומביים (png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}