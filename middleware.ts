import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { routeAccessPolicy, effectiveRole, isAccessAllowed } from '@/lib/auth/access-policy';
import type { UserRole } from '@/types';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create a response to mutate cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — required for Server Components to read auth state
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;
  const policy = routeAccessPolicy(pathname);

  // Redirect unauthenticated users to login
  if (!isLoggedIn && policy !== 'public') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect already-logged-in users away from login page
  if (isLoggedIn && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // For role-restricted routes, check the user's role
  if (isLoggedIn && typeof policy === 'object' && 'roles' in policy) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .maybeSingle();

    const role = effectiveRole(profile?.role as UserRole | undefined);
    const allowed = isAccessAllowed(pathname, policy, role, isLoggedIn);

    if (!allowed) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};