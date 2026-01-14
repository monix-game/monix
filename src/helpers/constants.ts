const LOCALSTORAGE_KEY = 'monix-do-not-touch-';

export function localStorageKey(key: string) {
  return LOCALSTORAGE_KEY + key;
}
