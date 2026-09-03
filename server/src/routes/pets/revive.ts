import { Elysia, t } from 'elysia';
import { getPetByUUID, mutateUserAndSave, updatePet } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

type ReviveOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string };

export const revivePet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/revive',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { pet_uuid } = body;

      if (!pet_uuid) {
        set.status = 400;
        return { error: 'Missing pet_uuid' };
      }

      const pet = await getPetByUUID(pet_uuid);
      if (!pet) {
        set.status = 404;
        return { error: 'Pet not found' };
      }
      if (!pet.is_dead) {
        set.status = 400;
        return { error: 'Pet is not dead' };
      }

      // It costs 100,000 to revive a pet
      const reviveCost = 100000;

      const result = await mutateUserAndSave<ReviveOutcome>(
        user_uuid,
        async fetchedUser => {
          if ((fetchedUser.money || 0) < reviveCost) {
            return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds to revive the pet' } };
          }
          fetchedUser.money = (fetchedUser.money || 0) - reviveCost;
          return { changed: true, value: { ok: 'success' as const, message: 'Pet revived successfully' } };
        }
      );

      if (!result) {
        set.status = 404;
        return { error: 'User not found' };
      }
      if (result.ok === 'error') {
        set.status = result.status;
        return { error: result.error };
      }

      // Revive the pet
      pet.is_dead = false;
      pet.time_last_fed = Date.now();
      pet.time_last_played = Date.now();
      await updatePet(pet);

      return result;
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default revivePet;
