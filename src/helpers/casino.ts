import { api } from './api';

export interface CasinoPlayResult {
  ok: 'success';
  stake: number;
  payout: number;
  multiplier: number;
  roomsCleared: number;
  money: number;
}

export async function playCasino(stake: number): Promise<CasinoPlayResult | null> {
  const response = await api.post<CasinoPlayResult>('/casino/play', { stake });
  return response.success ? response.data : null;
}
