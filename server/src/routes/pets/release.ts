import { Elysia, t } from 'elysia';
import { deletePetByUUID, getPetByUUID, mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';

type ReleaseOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string };

export const releasePet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/release',
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

      // If the pet is dead, it costs 500 to release.
      if (pet.is_dead) {
        const result = await mutateUserAndSave<ReleaseOutcome>(
          user_uuid,
          async fetchedUser => {
            const releaseCost = 500;
            if ((fetchedUser.money || 0) < releaseCost) {
              return { changed: false, value: { ok: 'error', status: 400, error: 'Insufficient funds to release the pet' } };
            }
            fetchedUser.money = (fetchedUser.money || 0) - releaseCost;
            return { changed: true, value: { ok: 'success' as const, message: 'Pet released successfully' } };
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
      } else {
        // Validate the user exists even when no deduction is needed.
        const exists = await mutateUserAndSave<ReleaseOutcome>(
          user_uuid,
          async () => ({ changed: false, value: { ok: 'success' as const, message: 'Pet released successfully' } })
        );
        if (!exists) {
          set.status = 404;
          return { error: 'User not found' };
        }
      }

      // Remove the pet from the database
      await deletePetByUUID(pet.uuid);

      return {
        message: 'Pet released successfully',
      };
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default releasePet;
