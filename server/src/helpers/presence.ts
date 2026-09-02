/**
 * Tracks which users currently have at least one authenticated WebSocket
 * connection (i.e. "actively online"). Used to decide whether a chat message
 * should produce a server-side web push: users who are online are served by
 * the live UI (unread dot + in-app toasts) instead of a system notification.
 *
 * A user may have several connections (multiple tabs/devices), so this counts
 * connections per user rather than using a simple set.
 */
const onlineConnections = new Map<string, number>();

export function addUserConnection(uuid: string) {
  onlineConnections.set(uuid, (onlineConnections.get(uuid) || 0) + 1);
}

export function removeUserConnection(uuid: string) {
  const count = onlineConnections.get(uuid);
  if (count === undefined) return;
  if (count <= 1) {
    onlineConnections.delete(uuid);
  } else {
    onlineConnections.set(uuid, count - 1);
  }
}

export function isUserOnline(uuid: string): boolean {
  return (onlineConnections.get(uuid) || 0) > 0;
}

export function getOnlineUserUuids(): string[] {
  return Array.from(onlineConnections.keys());
}

export function getOnlineUserCount(): number {
  return onlineConnections.size;
}
