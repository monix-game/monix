import { api } from './api';

/**
 * True when the browser supports the Notifications API, Push API and service
 * workers — the pieces required for web push (notifications while offline).
 */
export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.error('Failed to register service worker:', err);
    return null;
  }
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const resp = await api.get<{ publicKey: string }>('/push/vapid');
    if (resp?.success) return resp.data?.publicKey ?? null;
    return null;
  } catch {
    return null;
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return await reg.pushManager.getSubscription();
}

/**
 * Request permission and create (or reuse) a push subscription for this device,
 * then register it with the server.
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await registerPushServiceWorker();
    if (!registration) return false;

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = await getVapidPublicKey();
      if (!vapidKey) return false;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    const resp = await api.post<{ success: boolean }>('/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.toJSON().keys?.p256dh,
        auth: subscription.toJSON().keys?.auth,
      },
    });

    return resp?.success === true;
  } catch (err) {
    console.error('Failed to enable push notifications:', err);
    return false;
  }
}

export async function disablePushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return true;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : await getExistingSubscription();

    if (subscription) {
      await api.post<{ success: boolean }>('/push/unsubscribe', {
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    }
    return true;
  } catch (err) {
    console.error('Failed to disable push notifications:', err);
    return false;
  }
}

/** Convert a base64url VAPID public key to a Uint8Array for pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
