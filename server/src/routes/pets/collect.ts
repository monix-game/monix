import { Elysia } from 'elysia';
import { getPetsByOwnerUUID, mutateUserAndSave, updatePet } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { petPassiveRate } from '../../../common/pet';

export const collectPetEarnings = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post('/collect', async ({ authUser, set }) => {
    const userUuid = authUser?.uuid as string;
    const now = Date.now();
    const result = await mutateUserAndSave<{ ok: boolean; earned: number }>(
      userUuid,
      async user => {
        const pets = await getPetsByOwnerUUID(userUuid);
        let earned = 0;
        for (const pet of pets) {
          const elapsedMinutes = Math.max(
            0,
            Math.floor((now - (pet.last_passive_collected || now)) / 60000)
          );
          const passiveBonus = (user.permanent_upgrades?.deep_pockets || 0) * 0.05;
          const amount = pet.is_dead ? 0 : elapsedMinutes * petPassiveRate(pet, passiveBonus);
          earned += amount + (pet.passive_earned || 0);
          pet.passive_earned = 0;
          pet.last_passive_collected = now;
          await updatePet(pet);
        }
        user.money += earned;
        return { changed: earned > 0, value: { ok: true, earned } };
      }
    );
    if (!result) set.status = 404;
    return result || { error: 'User not found' };
  });

export default collectPetEarnings;
