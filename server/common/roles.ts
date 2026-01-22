const ROLE_HIERARCHY = ['owner', 'admin', 'mod', 'helper'];

export function hasRole(
  userRole: 'owner' | 'admin' | 'mod' | 'helper' | 'user',
  requiredRole: 'owner' | 'admin' | 'mod' | 'helper'
): boolean {
  if (!ROLE_HIERARCHY.includes(requiredRole)) {
    // Not staff role, automatically unauthorized
    return false;
  }

  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);

  return userRoleIndex <= requiredRoleIndex;
}
