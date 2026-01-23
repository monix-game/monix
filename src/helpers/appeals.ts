import { api } from './api';
import type { IAppeal } from '../../server/common/models/appeal';

export async function submitAppeal(punishment_uuid: string, reason: string): Promise<boolean> {
  try {
    const resp = await api.post<{ message: string; appeal: IAppeal }>('/appeals/submit', {
      punishment_uuid,
      reason,
    });
    if (resp && resp.success) {
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}

export async function getMyAppeals(): Promise<IAppeal[]> {
  try {
    const resp = await api.get<{ appeals: IAppeal[] }>('/appeals/my-appeals');
    if (resp && resp.success) {
      return resp.data?.appeals || [];
    } else {
      return [];
    }
  } catch {
    return [];
  }
}

export async function getAllAppeals(): Promise<IAppeal[]> {
  try {
    const resp = await api.get<{ appeals: IAppeal[] }>('/appeals/appeals');
    if (resp && resp.success) {
      return resp.data?.appeals || [];
    } else {
      return [];
    }
  } catch {
    return [];
  }
}

export async function reviewAppeal(
  appeal_uuid: string,
  status: 'approved' | 'denied',
  review_reason?: string
): Promise<boolean> {
  try {
    const resp = await api.post<{ message: string; appeal: IAppeal }>('/appeals/review', {
      appeal_uuid,
      status,
      review_reason,
    });
    if (resp && resp.success) {
      return true;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}
