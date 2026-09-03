import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { isUpgradeActive, MAGIC_JELLYBEAN_UPGRADE_ID } from '../../../common/upgrades';
import { calculateFishingResult, getFishValue } from '../../../common/fishing/fishing';
import type { IFish } from '../../../common/models/fish';
import { v4 } from 'uuid';

type FishOutcome =
  | { ok: 'error'; status: number; error: string }
  | { ok: 'success'; fishingResult: ReturnType<typeof calculateFishingResult>; fishCaught: IFish; success: boolean };

export const fish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/fish',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { auto_sell } = body;
      const now = Date.now();

      const result = await mutateUserAndSave<FishOutcome>(
        user_uuid,
        async fetchedUser => {
          const hasMagicJellybean = isUpgradeActive(
            fetchedUser.upgrades,
            MAGIC_JELLYBEAN_UPGRADE_ID,
            now
          );
          const fishingCooldownMs = hasMagicJellybean ? 2500 : 5000;

          // Check cooldown to prevent spamming (safe under the per-user lock).
          if (
            fetchedUser.fishing?.last_fished_at &&
            now - fetchedUser.fishing.last_fished_at < fishingCooldownMs
          ) {
            return {
              changed: false,
              value: { ok: 'error', status: 400, error: 'You are fishing too frequently. Please wait a moment.' },
            };
          }

          // Update last fished timestamp
          fetchedUser.fishing ??= {
            aquarium: { capacity: 10, level: 1, fish: [] },
            bait_owned: {},
            fish_caught: {},
            rods_owned: [],
          };
          fetchedUser.fishing.last_fished_at = now;

          const baitId = fetchedUser.fishing?.equipped_bait || null;
          const rodId = fetchedUser.fishing?.equipped_rod || 'damaged-rod';

          const fishingResult = calculateFishingResult(baitId, rodId);

          const fish: IFish = {
            uuid: v4(),
            user_uuid: fetchedUser.uuid,
            type: fishingResult.fish_type,
            weight: fishingResult.weight,
            modifiers: fishingResult.modifiers || [],
            caught_at: fishingResult.timestamp,
          };

          let success = false;
          if (
            fetchedUser.fishing.aquarium.fish.length < fetchedUser.fishing.aquarium.capacity &&
            !auto_sell
          ) {
            fetchedUser.fishing.aquarium.fish.push(fish);
            success = true;
          } else if (auto_sell) {
            const value = getFishValue(fish);
            fetchedUser.money += value;
            success = true;
          }

          // Update fish caught count
          fetchedUser.fishing.fish_caught ??= {};
          fetchedUser.fishing.fish_caught[fishingResult.fish_type] =
            (fetchedUser.fishing.fish_caught[fishingResult.fish_type] || 0) + 1;

          // Consume bait if used
          if (baitId) {
            fetchedUser.fishing.bait_owned ??= {};
            if (
              fetchedUser.fishing.bait_owned[baitId] &&
              fetchedUser.fishing.bait_owned[baitId] > 0
            ) {
              fetchedUser.fishing.bait_owned[baitId] -= 1;
            }

            // If bait runs out, unequip it
            if (
              fetchedUser.fishing.bait_owned[fetchedUser.fishing.equipped_bait ?? ''] <= 0
            ) {
              fetchedUser.fishing.equipped_bait = undefined;
            }
          }

          // Track lifetime stats
          fetchedUser.stats ??= DEFAULT_USER_STATS;
          fetchedUser.stats.fish_caught = (fetchedUser.stats.fish_caught || 0) + 1;
          if (baitId) {
            fetchedUser.stats.bait_used = (fetchedUser.stats.bait_used || 0) + 1;
          }
          if (auto_sell && success) {
            fetchedUser.stats.fish_sold = (fetchedUser.stats.fish_sold || 0) + 1;
          }

          return {
            changed: true,
            value: { ok: 'success', fishingResult, fishCaught: fish, success },
          };
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
      return {
        fishingResult: result.fishingResult,
        fishCaught: result.fishCaught,
        success: result.success,
      };
    },
    {
      body: t.Object({ auto_sell: t.Optional(t.Boolean()) }),
    }
  );

export default fish;
