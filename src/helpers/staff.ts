import type { IUser } from '../../server/common/models/user';
import type { IReport } from '../../server/common/models/report';
import { api } from './api';
import type { DashboardInfo } from '../../server/common/models/dashboardInfo';

export async function getDashboardInfo(): Promise<DashboardInfo | null> {
  try {
    const resp = await api.get<{ info: DashboardInfo }>('/staff/dashboard');
    if (resp?.success) {
      return resp.data?.info || null;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

export async function getUserByUUID(uuid: string): Promise<IUser | null> {
  try {
    const resp = await api.get<{ user: IUser }>(`/staff/user/${uuid}`);
    if (resp?.success) {
      return resp.data?.user || null;
    } else {
      return null;
    }
  } catch {
    return null;
  }
}

export async function getAllUsers(filter?: string): Promise<IUser[]> {
  try {
    const resp = await api.post<{ users: IUser[] }>('/staff/users', {
      filter,
    });
    if (resp?.success) {
      return resp.data?.users || [];
    } else {
      return [];
    }
  } catch {
    return [];
  }
}

export async function punishUser(
  uuid: string,
  category_id: string,
  reason: string
): Promise<boolean> {
  try {
    const resp = await api.post<{ message: string }>('/staff/punish', {
      target_user_uuid: uuid,
      category_id,
      reason,
    });
    return resp?.success;
  } catch {
    return false;
  }
}

export async function pardonUser(uuid: string, punishment_id: string): Promise<boolean> {
  try {
    const resp = await api.post<{ message: string }>('/staff/pardon', {
      target_user_uuid: uuid,
      punishment_id,
    });
    return resp?.success;
  } catch {
    return false;
  }
}

export async function deletePunishment(uuid: string, punishment_id: string): Promise<boolean> {
  try {
    const resp = await api.post<{ message: string }>('/staff/punishment/delete', {
      target_user_uuid: uuid,
      punishment_id,
    });
    return resp?.success;
  } catch {
    return false;
  }
}

export async function getAllReports(): Promise<IReport[]> {
  try {
    const resp = await api.get<{ reports: IReport[] }>('/staff/reports');
    if (resp?.success) {
      return resp.data?.reports || [];
    } else {
      return [];
    }
  } catch {
    return [];
  }
}

export async function reviewReport(
  report_uuid: string,
  action: 'punish_reported' | 'punish_reporter' | 'dismissed'
): Promise<boolean> {
  try {
    const resp = await api.post(`/staff/reports/${report_uuid}/review`, {
      action,
    });
    return resp?.success;
  } catch (err) {
    console.error('Error reviewing report', err);
    return false;
  }
}

export async function changeReportCategory(
  report_uuid: string,
  new_category_id: string
): Promise<boolean> {
  try {
    const resp = await api.post(`/staff/reports/${report_uuid}/change-category`, {
      new_category_id,
    });
    return resp?.success;
  } catch (err) {
    console.error('Error changing report category', err);
    return false;
  }
}
