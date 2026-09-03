type UserChangedListener = (uuid: string) => void;

const listeners = new Set<UserChangedListener>();

export function onUserChanged(listener: UserChangedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitUserChanged(uuid: string): void {
  for (const listener of listeners) listener(uuid);
}
