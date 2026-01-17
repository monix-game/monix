import type { IPet } from '../../server/common/models/pet';
import { api } from './api';

export async function getAllPets(): Promise<IPet[]> {
  try {
    const resp = await api.get<{ pets: IPet[] }>('/pets/all');
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.pets) {
        return payload.pets;
      }
    }
    return [];
  } catch (err) {
    console.error('Error fetching all pets', err);
    return [];
  }
}

export async function adoptPet(): Promise<IPet | null> {
  try {
    const resp = await api.post<{ pet: IPet }>('/pets/adopt');
    if (resp && resp.success) {
      const payload = resp.data;
      if (payload && payload.pet) {
        return payload.pet;
      }
    }
    return null;
  } catch (err) {
    console.error('Error adopting pet', err);
    return null;
  }
}

export async function namePet(petId: string, name: string): Promise<boolean> {
  try {
    const resp = await api.post<{ success: boolean }>(`/pets/name`, {
      pet_uuid: petId,
      name,
    });
    if (resp && resp.success) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error naming pet', err);
    return false;
  }
}

export async function feedPet(petId: string): Promise<boolean> {
  try {
    const resp = await api.post<{ success: boolean }>(`/pets/feed`, {
      pet_uuid: petId,
    });
    if (resp && resp.success) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error feeding pet', err);
    return false;
  }
}

export async function playWithPet(petId: string): Promise<boolean> {
  try {
    const resp = await api.post<{ success: boolean }>(`/pets/play`, {
      pet_uuid: petId,
    });
    if (resp && resp.success) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error playing with pet', err);
    return false;
  }
}

export async function releasePet(petId: string): Promise<boolean> {
  try {
    const resp = await api.post<{ success: boolean }>(`/pets/release`, {
      pet_uuid: petId,
    });
    if (resp && resp.success) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error releasing pet', err);
    return false;
  }
}

export async function levelUpPet(petId: string): Promise<boolean> {
  try {
    const resp = await api.post<{ success: boolean }>(`/pets/levelup`, {
      pet_uuid: petId,
    });
    if (resp && resp.success) {
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error leveling up pet', err);
    return false;
  }
}
