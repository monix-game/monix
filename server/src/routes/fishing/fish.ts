import { Elysia, t } from 'elysia';
import { mutateUserAndSave } from '../../db';
import { deriveAuth, onlyActive } from '../../middleware';
import { DEFAULT_USER_STATS } from '../../../common/models/user';
import { isUpgradeActive, MAGIC_JELLYBEAN_UPGRADE_ID } from '../../../common/upgrades';
import { calculateFishingResult, getFishValue } from '../../../common/fishing/fishing';
import { FRENZY_COOLDOWN_S, isFishingFrenzyActive } from '../../../common/fishing/fishingFrenzy';
import { SATCHEL_CAPACITY } from '../../../common/pet';
import type { IFish } from '../../../common/models/fish';
import { v4 } from 'uuid';

type FishOutcome =
  | { ok: 'error'; status: number; error: string }
  | {
      ok: 'success';
      fishingResult: ReturnType<typeof calculateFishingResult>;
      fishCaught: IFish;
      success: boolean;
      strayCaught: boolean;
      satchelFull: boolean;
      nextCatchAutoSell: boolean;
      autoSold: boolean;
    };

export const fish = new Elysia()
  .derive(({ headers }) => deriveAuth(headers))
  .onBeforeHandle(onlyActive)
  .post(
    '/fish',
    async ({ body, authUser, set }) => {
      const user_uuid = authUser?.uuid as string;
      const { auto_sell } = body;
      const now = Date.now();

      const result = await mutateUserAndSave<FishOutcome>(user_uuid, fetchedUser => {
        const hasMagicJellybean = isUpgradeActive(
          fetchedUser.upgrades,
          MAGIC_JELLYBEAN_UPGRADE_ID,
          now
        );
        const frenzyActive = isFishingFrenzyActive(now);
        const fishingCooldownMs = frenzyActive
          ? FRENZY_COOLDOWN_S * 1000
          : hasMagicJellybean
            ? 2500
            : 5000;

        // Check cooldown to prevent spamming (safe under the per-user lock).
        if (
          fetchedUser.fishing?.last_fished_at &&
          now - fetchedUser.fishing.last_fished_at < fishingCooldownMs
        ) {
          return {
            changed: false,
            value: {
              ok: 'error',
              status: 400,
              error: 'You are fishing too frequently. Please wait a moment.',
            },
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

        const fishingResult = calculateFishingResult(
          baitId,
          rodId,
          fetchedUser.upgrades
        );

        const fish: IFish = {
          uuid: v4(),
          user_uuid: fetchedUser.uuid,
          type: fishingResult.fish_type,
          weight: fishingResult.weight,
          modifiers: fishingResult.modifiers || [],
          caught_at: fishingResult.timestamp,
        };

        let success = false;
        let strayCaught = false;
        let satchelFull = false;
        let autoSold = false;

        fetchedUser.stats ??= DEFAULT_USER_STATS;

        // A pending auto-sell was forced by an *earlier* cast's stray pet, so it
        // must be read before this cast can set a new one — otherwise the stray
        // would consume its own flag and sell the very fish it is meant to
        // protect.
        const pendingAutoSell = Boolean(fetchedUser.fishing.next_catch_auto_sell);
        const effectiveAutoSell = Boolean(auto_sell || pendingAutoSell);

        // Consume the pending flag up front. Clearing it here rather than after
        // the fish is stored means a stray caught on this same cast can re-arm it
        // for the next one instead of being clobbered.
        fetchedUser.fishing.next_catch_auto_sell = false;

        // A stray pet is caught *in addition to* the fish. The pet is stashed in
        // the satchel and the next eligible catch is force auto-sold so there is
        // room to actually keep this one.
        if (fishingResult.stray_pet) {
          const satchel = (fetchedUser.fishing.satchel ??= []);
          if (satchel.length >= SATCHEL_CAPACITY) {
            satchelFull = true;
          } else {
            satchel.push({
              uuid: v4(),
              type_id: fishingResult.stray_pet.type_id,
              rarity: fishingResult.stray_pet.rarity,
              name: null,
              caught_at: now,
            });
            strayCaught = true;
            fetchedUser.fishing.next_catch_auto_sell = true;
            fetchedUser.stats.pets_caught = (fetchedUser.stats.pets_caught || 0) + 1;
          }
        }

        if (
          fetchedUser.fishing.aquarium.fish.length < fetchedUser.fishing.aquarium.capacity &&
          !effectiveAutoSell
        ) {
          fetchedUser.fishing.aquarium.fish.push(fish);
          success = true;
        } else if (effectiveAutoSell) {
          const value = getFishValue(fish);
          fetchedUser.money += value;
          success = true;
          autoSold = true;
        }
        // Otherwise the aquarium is full and auto-sell is off: the catch is lost,
        // which matches the pre-existing behaviour.

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
          if (fetchedUser.fishing.bait_owned[fetchedUser.fishing.equipped_bait ?? ''] <= 0) {
            fetchedUser.fishing.equipped_bait = undefined;
          }
        }

        // Track lifetime stats
        fetchedUser.stats ??= DEFAULT_USER_STATS;
        fetchedUser.stats.fish_caught = (fetchedUser.stats.fish_caught || 0) + 1;
        if (baitId) {
          fetchedUser.stats.bait_used = (fetchedUser.stats.bait_used || 0) + 1;
        }
        if (autoSold) {
          fetchedUser.stats.fish_sold = (fetchedUser.stats.fish_sold || 0) + 1;
        }

        return {
          changed: true,
          value: {
            ok: 'success',
            fishingResult,
            fishCaught: fish,
            success,
            strayCaught,
            satchelFull,
            nextCatchAutoSell: Boolean(fetchedUser.fishing.next_catch_auto_sell),
            autoSold,
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
      return {
        fishingResult: result.fishingResult,
        fishCaught: result.fishCaught,
        success: result.success,
        strayCaught: result.strayCaught,
        satchelFull: result.satchelFull,
        nextCatchAutoSell: result.nextCatchAutoSell,
        autoSold: result.autoSold,
      };
    },
    {
      body: t.Object({ auto_sell: t.Optional(t.Boolean()) }),
    }
  );

export default fish;
