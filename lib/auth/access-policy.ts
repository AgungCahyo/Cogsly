import type { UserRole } from '@/types';

/**
 * URL access rules — keep aligned with `components/LayoutShell.tsx` navigation roles.
 */
export function routeAccessPolicy(pathname: string): 'public' | 'member' | { roles: UserRole[] } {
  if (pathname.startsWith('/login')) return 'public';
  if (pathname.startsWith('/access-denied')) return 'member';

  if (pathname === '/' || pathname === '') {
    return { roles: ['admin', 'warehouse', 'cashier'] };
  }
  if (pathname.startsWith('/ingredients/waste')) {
    return { roles: ['admin', 'warehouse'] };
  }
  if (pathname.startsWith('/ingredients')) {
    return { roles: ['admin', 'warehouse'] };
  }
  if (pathname.startsWith('/procurement')) {
    return { roles: ['admin', 'warehouse'] };
  }
  if (pathname.startsWith('/recipes')) {
    return { roles: ['admin'] };
  }
  if (pathname.startsWith('/reservations')) {
    return { roles: ['admin', 'cashier', 'waiter'] };
  }
  if (pathname.startsWith('/pos')) {
    return { roles: ['admin', 'cashier', 'waiter'] };
  }
  if (pathname.startsWith('/recap')) {
    return { roles: ['admin', 'cashier'] };
  }

  if (pathname.startsWith('/api/debug')) {
    return { roles: ['admin'] };
  }
  if (pathname.startsWith('/api/purchases')) {
    return { roles: ['admin', 'warehouse', 'cashier'] };
  }
  if (pathname.startsWith('/api/')) {
    return 'member';
  }

  return 'member';
}

export function effectiveRole(profileRole: UserRole | null | undefined): UserRole {
  return profileRole ?? 'waiter';
}

export function isAccessAllowed(
  pathname: string,
  policy: ReturnType<typeof routeAccessPolicy>,
  role: UserRole,
  isLoggedIn: boolean
): boolean {
  if (policy === 'public') return true;
  if (!isLoggedIn) return false;
  if (policy === 'member') return true;
  return policy.roles.includes(role);
}
