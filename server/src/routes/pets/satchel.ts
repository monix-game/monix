import { Elysia, t } from 'elysia';
import { createPet, getPetsByOwnerUUID, getUserByUUID, mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import type { IPet } from '../../../common/models/pet';
import { petToDoc } from '../../../common/models/pet';
import { DEFAULT_USER_STATS, type IStrayPet } from '../../../common/models/user';
import { SATCHEL_CAPACITY, STRAY_ADOPTION_COST } from '../../../common/pet';
import { getPetSlotLimit } from './helpers';
import { v4 } from 'uuid';

type SatchelOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      message: string;
      pet: ReturnType<typeof petToDoc>;
      satchel: IStrayPet[];
      slotLimit: number;
    };

type ReleaseOutcome =
  | { status: number; error: string }
  | { satchel: IStrayPet[] };

export const satchel = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/satchel/adopt',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { stray_uuid } = body;

      if (!stray_uuid) {
        set.status = 400;
        return { error: 'Missing stray_uuid' };
      }

      const result = await mutateUserAndSave<SatchelOutcome>(user_uuid, async fetchedUser => {
        fetchedUser.fishing ??= {
          aquarium: { capacity: 10, level: 1, fish: [] },
          bait_owned: {},
          fish_caught: {},
          rods_owned: [],
          satchel: [],
        };
        const satchelPets = (fetchedUser.fishing.satchel ??= []);

        const index = satchelPets.findIndex(stray => stray.uuid === stray_uuid);
        if (index === -1) {
          return {
            changed: false,
            value: { ok: 'error', status: 404, error: 'Stray pet not found in your satchel' },
          };
        }

        const pets = await getPetsByOwnerUUID(user_uuid);
        const slotLimit = getPetSlotLimit(fetchedUser);
        if (pets.length >= slotLimit) {
          return {
            changed: false,
            value: {
              ok: 'error',
              status: 400,
              error: `You have reached the maximum number of pets (${slotLimit})`,
            },
          };
        }

        if ((fetchedUser.money || 0) < STRAY_ADOPTION_COST) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Insufficient funds to adopt this pet' },
          };
        }

        const [stray] = satchelPets.splice(index, 1);

        fetchedUser.money = (fetchedUser.money || 0) - STRAY_ADOPTION_COST;
        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.pets_adopted = (fetchedUser.stats.pets_adopted || 0) + 1;

        const now = Date.now();
        const pet: IPet = {
          uuid: v4(),
          owner_uuid: user_uuid,
          name: stray.name,
          type_id: stray.type_id,
          level: 1,
          time_last_fed: now,
          time_last_played: now,
          time_created: stray.caught_at || now,
          exp: 0,
          is_dead: false,
          rarity: stray.rarity,
          bond: 0,
          passive_earned: 0,
          last_passive_collected: now,
          charmed_until: null,
        };

        await createPet(pet);

        return {
          changed: true,
          value: {
            ok: 'success' as const,
            message: 'Stray pet adopted successfully',
            pet: petToDoc(pet),
            satchel: satchelPets,
            slotLimit: getPetSlotLimit(fetchedUser),
          },
        };
      });

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }
      return result;
    },
    { body: t.Object({ stray_uuid: t.String() }) }
  )
  // Throwing a stray back frees satchel space without spending anything.
  .post(
    '/satchel/release',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { stray_uuid } = body;

      if (!stray_uuid) {
        set.status = 400;
        return { error: 'Missing stray_uuid' };
      }

      const result = await mutateUserAndSave<ReleaseOutcome>(user_uuid, fetchedUser => {
        fetchedUser.fishing ??= {
          aquarium: { capacity: 10, level: 1, fish: [] },
          bait_owned: {},
          fish_caught: {},
          rods_owned: [],
          satchel: [],
        };
        const satchelPets = (fetchedUser.fishing.satchel ??= []);
        const index = satchelPets.findIndex(stray => stray.uuid === stray_uuid);
        if (index === -1) {
          return {
            changed: false,
            value: { status: 404, error: 'Stray pet not found in your satchel' },
          };
        }

        satchelPets.splice(index, 1);
        return { changed: true, value: { satchel: satchelPets } };
      });

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if ('error' in result) {
        set.status = result.status;
        return { error: result.error };
      }
      return { message: 'Stray pet released', satchel: result.satchel };
    },
    { body: t.Object({ stray_uuid: t.String() }) }
  )
  .get('/satchel', async ({ authUser, set }) => {
    const user_uuid = authUser?.uuid as string;
    // Read-only: getUserByUUID is cached and userFromDoc already normalises the
    // satchel, so there is no need to take the per-user write lock here.
    const user = await getUserByUUID(user_uuid);
    if (!user) {
      set.status = 404;
      return { error: 'User not found' };
    }
    return {
      satchel: user.fishing?.satchel ?? [],
      capacity: SATCHEL_CAPACITY,
      slotLimit: getPetSlotLimit(user),
      adoptionCost: STRAY_ADOPTION_COST,
    };
  });

export default satchel;
