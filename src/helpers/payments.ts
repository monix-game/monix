import { api } from './api';

export async function createPaymentSession(item: string, username: string): Promise<string | null> {
  try {
    const resp = await api.post<{ url: string }>('/hooks/session', {
      item,
      username,
    });
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.url) {
        return payload.url;
      }
    }
    return null;
  } catch (err) {
    console.error('Error creating payment session', err);
    return null;
  }
}
