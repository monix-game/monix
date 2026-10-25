import { api } from './api';

export interface TransferMoneyResult {
  ok: boolean;
  message: string;
}

/**
 * Send money from the signed-in account to another user.
 *
 * The API helper resolves failed requests (including 4xx responses) instead of
 * throwing, so the server's validation message can be surfaced directly.
 */
export async function transferMoney(
  username: string,
  amount: number
): Promise<TransferMoneyResult> {
  try {
    // Never automatically retry a transfer: if the server processed the
    // request but the response timed out, a retry would send the money twice.
    const resp = await api.post<{ message?: string }>(
      '/user/transfer',
      { username, amount },
      { retries: 0 }
    );
    if (resp.success) {
      return { ok: true, message: resp.data?.message ?? 'Money sent successfully.' };
    }
    return {
      ok: false,
      message: resp.error?.message || 'Could not send money. Please try again.',
    };
  } catch (err) {
    console.error('Error transferring money', err);
    return { ok: false, message: 'Could not send money. Please try again.' };
  }
}
