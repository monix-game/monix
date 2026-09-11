import { Elysia, t } from 'elysia';
import { getPetByUUID, mutateUserAndSave, updatePet } from '../../db';
import { petToDoc } from '../../../common/models/pet';
import { deriveAuth, onlyActive } from '../../middleware';
import { CHARM_COST_GEMS, CHARM_DURATION_MS, isPetCharmed } from '../../../common/pet';
import { hasGems } from '../../../common/math';

type CharmOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; message: string; pet: ReturnType<typeof petToDoc> };

export const charmPet = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/charm',
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
      if (pet.owner_uuid !== user_uuid) {
        set.status = 403;
        return { error: 'You do not own this pet' };
      }
      if (isPetCharmed(pet)) {
        set.status = 400;
        return { error: 'This pet is already charmed' };
      }

      const result = await mutateUserAndSave<CharmOutcome>(user_uuid, fetchedUser => {
        if (!hasGems(fetchedUser.gems, CHARM_COST_GEMS)) {
          return {
            changed: false,
            value: { ok: 'error', status: 400, error: 'Insufficient gems to charm the pet' },
          };
        }

        if (fetchedUser.gems !== -1) {
          fetchedUser.gems = (fetchedUser.gems || 0) - CHARM_COST_GEMS;
        }

        pet.charmed_until = Date.now() + CHARM_DURATION_MS;
        return {
          changed: true,
          value: {
            ok: 'success' as const,
            message: 'Pet charmed successfully',
            pet: petToDoc(pet),
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

      await updatePet(pet);

      return result;
    },
    {
      body: t.Object({ pet_uuid: t.Optional(t.String()) }),
    }
  );

export default charmPet;
