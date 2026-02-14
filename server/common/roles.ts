const ROLE_HIERARCHY = ['owner', 'admin', 'mod', 'helper', 'user'];

export function hasRole(
  userRole: 'owner' | 'admin' | 'mod' | 'helper' | 'user',
  requiredRole: 'owner' | 'admin' | 'mod' | 'helper' | 'user'
): boolean {
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);

  return userRoleIndex <= requiredRoleIndex;
}

export function hasPowerOver(
  userRole: 'owner' | 'admin' | 'mod' | 'helper' | 'user',
  targetRole: 'owner' | 'admin' | 'mod' | 'helper' | 'user'
): boolean {
  if (userRole === 'owner' || userRole === 'admin') return true;

  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  const targetRoleIndex = ROLE_HIERARCHY.indexOf(targetRole);

  return userRoleIndex < targetRoleIndex;
}
